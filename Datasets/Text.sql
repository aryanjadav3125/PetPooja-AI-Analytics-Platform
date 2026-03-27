
-- =====================================
-- PETPOOJA AI DATABASE SETUP
-- =====================================

CREATE DATABASE petpooja_ai;
\c petpooja_ai;

-- =====================================
-- MERCHANT TABLE
-- =====================================

CREATE TABLE merchants (
    merchant_id VARCHAR(10) PRIMARY KEY,
    restaurant_name VARCHAR(200),
    location TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    owner_name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(150),
    created_at TIMESTAMP
);

-- =====================================
-- MENU TABLE
-- =====================================

CREATE TABLE menu_items (
    item_id VARCHAR(10) PRIMARY KEY,
    merchant_id VARCHAR(10),

    item_name VARCHAR(200),
    category VARCHAR(100),

    selling_price INT,
    food_cost INT,
    contribution_margin INT,

    is_active BOOLEAN,
    created_at TIMESTAMP,

    CONSTRAINT fk_menu_merchant
    FOREIGN KEY (merchant_id)
    REFERENCES merchants(merchant_id)
);

-- =====================================
-- ORDERS TABLE
-- =====================================

CREATE TABLE orders (

    order_id INT PRIMARY KEY,

    merchant_id VARCHAR(10),

    order_time TIMESTAMP,

    order_channel VARCHAR(50),

    customer_phone VARCHAR(20),

    total_amount INT,

    CONSTRAINT fk_orders_merchant
    FOREIGN KEY (merchant_id)
    REFERENCES merchants(merchant_id)
);

-- =====================================
-- ORDER ITEMS TABLE
-- =====================================

CREATE TABLE order_items (

    order_item_id INT PRIMARY KEY,

    order_id INT,

    item_id VARCHAR(10),

    quantity INT,

    selling_price INT,

    food_cost INT,

    profit INT,

    CONSTRAINT fk_orderitems_orders
    FOREIGN KEY (order_id)
    REFERENCES orders(order_id),

    CONSTRAINT fk_orderitems_menu
    FOREIGN KEY (item_id)
    REFERENCES menu_items(item_id)
);

-- =====================================
-- INVENTORY TABLE
-- =====================================

CREATE TABLE inventory (

    inventory_id SERIAL PRIMARY KEY,

    merchant_id VARCHAR(10),

    ingredient_name VARCHAR(150),

    stock_quantity INT,

    unit VARCHAR(50),

    cost_per_unit INT,

    last_updated TIMESTAMP,

    CONSTRAINT fk_inventory_merchant
    FOREIGN KEY (merchant_id)
    REFERENCES merchants(merchant_id)
);

-- =====================================
-- IMPORT CSV FILES
-- =====================================

COPY merchants
FROM '/path/Merchant.csv'
DELIMITER ','
CSV HEADER;

COPY menu_items
FROM '/path/Menu_Table.csv'
DELIMITER ','
CSV HEADER;

COPY orders
FROM '/path/Order_Table.csv'
DELIMITER ','
CSV HEADER;

COPY order_items
FROM '/path/Order_Item_Table.csv'
DELIMITER ','
CSV HEADER;

COPY inventory
FROM '/path/Inventory_Table.csv'
DELIMITER ','
CSV HEADER;

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

CREATE INDEX idx_menu_merchant
ON menu_items(merchant_id);

CREATE INDEX idx_orders_merchant
ON orders(merchant_id);

CREATE INDEX idx_orderitems_order
ON order_items(order_id);

CREATE INDEX idx_orderitems_item
ON order_items(item_id);

-- =====================================
-- ANALYTICS VIEW 1
-- ITEM SALES PERFORMANCE
-- =====================================

CREATE VIEW item_sales_analysis AS

SELECT

m.item_id,

m.item_name,

m.category,

m.contribution_margin,

SUM(o.quantity) AS total_sold,

SUM(o.profit) AS total_profit

FROM menu_items m

LEFT JOIN order_items o
ON m.item_id = o.item_id

GROUP BY
m.item_id,
m.item_name,
m.category,
m.contribution_margin;

-- =====================================
-- ANALYTICS VIEW 2
-- MENU CLASSIFICATION
-- STAR / PUZZLE / DOG
-- =====================================

CREATE VIEW menu_performance_classification AS

SELECT

item_name,

category,

contribution_margin,

total_sold,

CASE

WHEN contribution_margin > 150 AND total_sold > 50
THEN 'STAR'

WHEN contribution_margin > 150 AND total_sold <= 50
THEN 'PUZZLE'

WHEN contribution_margin <= 150 AND total_sold > 50
THEN 'PLOWHORSE'

ELSE 'DOG'

END AS menu_category

FROM item_sales_analysis;

-- =====================================
-- ANALYTICS VIEW 3
-- AVERAGE ORDER VALUE
-- =====================================

CREATE VIEW aov_analysis AS

SELECT

merchant_id,

AVG(total_amount) AS average_order_value,

COUNT(order_id) AS total_orders

FROM orders

GROUP BY merchant_id;

-- =====================================
-- ANALYTICS VIEW 4
-- COMBO DETECTION DATASET
-- =====================================

CREATE VIEW combo_detection AS

SELECT

a.item_id AS item_a,

b.item_id AS item_b,

COUNT(*) AS frequency

FROM order_items a

JOIN order_items b
ON a.order_id = b.order_id
AND a.item_id <> b.item_id

GROUP BY
a.item_id,
b.item_id;

-- =====================================
-- ANALYTICS VIEW 5
-- DEMAND FORECAST BASE
-- =====================================

CREATE VIEW item_demand_trends AS

SELECT

item_id,

DATE(order_time) AS order_date,

SUM(quantity) AS daily_sales

FROM order_items oi

JOIN orders o
ON oi.order_id = o.order_id

GROUP BY
item_id,
DATE(order_time);

-- =====================================
-- RECOMMENDATION TABLE
-- =====================================

CREATE TABLE recommendations (

recommendation_id SERIAL PRIMARY KEY,

merchant_id VARCHAR(10),

recommendation_type VARCHAR(100),

item_id VARCHAR(10),

reason TEXT,

expected_profit INT,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- =====================================
-- UPSALE RECOMMENDATION VIEW
-- =====================================

CREATE VIEW upsell_candidates AS

SELECT

item_name,

contribution_margin,

total_sold

FROM item_sales_analysis

WHERE contribution_margin > 150
AND total_sold < 50;

-- =====================================
-- LOW PROFIT HIGH VOLUME
-- =====================================

CREATE VIEW price_optimization_candidates AS

SELECT

item_name,

contribution_margin,

total_sold

FROM item_sales_analysis

WHERE contribution_margin < 100
AND total_sold > 100;

-- =====================================
-- INVENTORY SIGNALS
-- =====================================

CREATE VIEW inventory_alerts AS

SELECT

ingredient_name,

stock_quantity,

cost_per_unit

FROM inventory

WHERE stock_quantity < 20;
