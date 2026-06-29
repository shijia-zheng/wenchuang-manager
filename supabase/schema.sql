-- ============================================================
-- 文创品管理平台 - Supabase 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================================

-- 1. 材质分类表
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 产品统一表
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier TEXT NOT NULL CHECK (tier IN ('self_designed', 'curated', 'general')),
    name TEXT NOT NULL,
    material_category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    image_url TEXT,
    description TEXT DEFAULT '',
    submitter TEXT DEFAULT '',
    -- 自设计品专属字段
    size TEXT DEFAULT '',
    inventory_quantity INTEGER DEFAULT 0,
    listed_price NUMERIC(10, 2),
    cost_price NUMERIC(10, 2),
    -- 严选品/泛选品专属字段
    reference_price NUMERIC(10, 2),
    source_url TEXT DEFAULT '',
    -- 通用元数据
    status TEXT DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material_category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tier_material ON products(tier, material_category_id);

-- 4. 种子数据 - 材质分类
INSERT INTO material_categories (name, sort_order) VALUES
    ('金属', 1),
    ('纸质', 2),
    ('布艺', 3),
    ('亚克力', 4),
    ('木质', 5),
    ('陶瓷', 6),
    ('皮革', 7),
    ('玻璃', 8),
    ('塑料', 9),
    ('其他', 10)
ON CONFLICT (name) DO NOTHING;

-- 5. 种子数据 - 示例产品（仅在表为空时插入）
DO $$
DECLARE
    metal_id UUID; paper_id UUID; fabric_id UUID; acrylic_id UUID;
    wood_id UUID; ceramic_id UUID;
BEGIN
    -- 如果产品表已有数据则跳过
    IF EXISTS (SELECT 1 FROM products LIMIT 1) THEN
        RETURN;
    END IF;

    -- 获取分类ID
    SELECT id INTO metal_id FROM material_categories WHERE name = '金属';
    SELECT id INTO paper_id FROM material_categories WHERE name = '纸质';
    SELECT id INTO fabric_id FROM material_categories WHERE name = '布艺';
    SELECT id INTO acrylic_id FROM material_categories WHERE name = '亚克力';
    SELECT id INTO wood_id FROM material_categories WHERE name = '木质';
    SELECT id INTO ceramic_id FROM material_categories WHERE name = '陶瓷';

    -- 自设计品
    INSERT INTO products (tier, name, material_category_id, size, inventory_quantity, listed_price, cost_price, description, submitter, status) VALUES
    ('self_designed', '故宫文创金属书签', metal_id, '12×3cm', 50, 38.00, 15.00, '以故宫建筑元素为灵感设计的金属书签', '张三', 'active'),
    ('self_designed', '国潮纸质笔记本', paper_id, 'A5', 100, 25.00, 8.00, '封面采用传统纹样设计', '李四', 'active'),
    ('self_designed', '文创帆布包', fabric_id, '40×35cm', 3, 68.00, 28.00, '环保帆布材质，原创插画印花', '王五', 'low_stock'),
    ('self_designed', '透明亚克力钥匙扣', acrylic_id, '5×5cm', 200, 12.00, 4.50, '双面印刷，可定制图案', '张三', 'active');

    -- 严选品
    INSERT INTO products (tier, name, material_category_id, description, submitter, reference_price, source_url, status) VALUES
    ('curated', '复古黄铜印章', metal_id, '手工雕刻复古风格印章，适合文创盖章打卡', '李四', 88.00, 'https://example.com/source/1', 'pending_review'),
    ('curated', '手绘陶瓷杯垫', ceramic_id, '景德镇手工绘制陶瓷杯垫，每件独一无二', '王五', 45.00, 'https://example.com/source/2', 'approved');

    -- 泛选品
    INSERT INTO products (tier, name, material_category_id, description, submitter, reference_price, source_url, status) VALUES
    ('general', '竹编书签套装', wood_id, '传统竹编工艺书签，三枚套装', '赵六', 28.00, 'https://example.com/source/3', 'active'),
    ('general', '故宫联名丝巾', fabric_id, '故宫博物院联名款真丝方巾', '张三', 168.00, 'https://example.com/source/4', 'active');
END $$;

-- 6. 更新触发器（自动更新 updated_at）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_material_categories_updated_at') THEN
        CREATE TRIGGER update_material_categories_updated_at
            BEFORE UPDATE ON material_categories
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
        CREATE TRIGGER update_products_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. RLS 策略
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 允许认证用户完全访问
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated on material_categories') THEN
        CREATE POLICY "Allow all for authenticated on material_categories" ON material_categories
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated on products') THEN
        CREATE POLICY "Allow all for authenticated on products" ON products
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================
-- 存储桶和策略请在 Supabase Dashboard → Storage 中手动创建:
-- 1. 创建公开桶: product-images
-- 2. 设置 MIME 类型限制: image/jpeg, image/png, image/webp, image/gif
-- 3. 文件大小限制: 5MB
-- 4. 添加策略: SELECT 公开, INSERT 认证用户
-- ============================================================
