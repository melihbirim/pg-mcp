# PostgreSQL MCP Server Demo

This document shows examples of how the PostgreSQL MCP server enables natural language database queries.

## Test Database Setup

We have a sample e-commerce database running in Docker with the following structure:

### Tables:
- **users**: Customer information (id, name, email, age, created_at, is_active)
- **categories**: Product categories (id, name, description)
- **products**: Product catalog (id, name, description, price, category_id, stock_quantity)
- **orders**: Customer orders (id, user_id, total_amount, status, order_date)
- **order_items**: Order line items (id, order_id, product_id, quantity, unit_price)

### Sample Data:
- 5 users (Alice, Bob, Carol, David, Eva)
- 4 categories (Electronics, Books, Clothing, Home & Garden)
- 7 products (Laptop, Headphones, Books, T-Shirt, Garden Tools, Smartphone, Cookbook)
- 5 orders with multiple items

## Natural Language Examples

Here are examples of how an AI assistant could use this MCP server to answer natural language questions:

### 🔍 **Schema Exploration**

**Human**: "What tables are in this database?"
**AI Response**: *Uses `list_tables` tool*
> "The database contains 5 tables: users (BASE TABLE), categories (BASE TABLE), products (BASE TABLE), orders (BASE TABLE), and order_items (BASE TABLE)."

**Human**: "Tell me about the users table structure"
**AI Response**: *Uses `describe_table` tool with tableName: "users"*
> "The users table has the following columns:
> - id: integer, NOT NULL, PRIMARY KEY
> - name: varchar(100), NOT NULL
> - email: varchar(150), NOT NULL (unique)
> - age: integer (must be > 0)
> - created_at: timestamp, defaults to current time
> - is_active: boolean, defaults to true"

### 📊 **Data Queries**

**Human**: "How many customers do we have?"
**AI Response**: *Uses `execute_query` with "SELECT COUNT(*) as customer_count FROM users"*
> "We have 5 customers in the database."

**Human**: "Who are our oldest customers?"
**AI Response**: *Uses `execute_query` with "SELECT name, age FROM users ORDER BY age DESC LIMIT 3"*
> "Our oldest customers are:
> 1. Carol Davis (42 years old)
> 2. Bob Smith (35 years old)  
> 3. Eva Brown (31 years old)"

**Human**: "What are the most expensive products?"
**AI Response**: *Uses `execute_query` with "SELECT name, price FROM products ORDER BY price DESC LIMIT 3"*
> "The most expensive products are:
> 1. Laptop Pro - $1,299.99
> 2. Smartphone - $799.99
> 3. Wireless Headphones - $249.99"

**Human**: "Which products have never been ordered?"
**AI Response**: *Uses `execute_query` with complex LEFT JOIN query*
> "Currently, all products in our catalog have been ordered at least once."

### 💰 **Business Analytics**

**Human**: "What's the total revenue from completed orders?"
**AI Response**: *Uses `execute_query` with "SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = 'completed'"*
> "The total revenue from completed orders is $2,459.96."

**Human**: "Who is our best customer by order value?"
**AI Response**: *Uses `execute_query` with complex JOIN and GROUP BY*
> "Alice Johnson is our best customer with orders totaling $1,639.97."

**Human**: "What categories are selling best?"
**AI Response**: *Uses `execute_query` with JOIN between categories, products, and order_items*
> "Electronics is our best-selling category, followed by Clothing."

### 🔗 **Relationship Queries**

**Human**: "Show me all orders with customer details"
**AI Response**: *Uses `execute_query` with JOIN between orders and users*
> "Here are all orders with customer information: [detailed order list with customer names and emails]"

**Human**: "What products did Alice Johnson buy?"
**AI Response**: *Uses `execute_query` with complex JOIN across multiple tables*
> "Alice Johnson purchased:
> - Laptop Pro ($1,299.99)
> - Wireless Headphones ($249.99)
> - Garden Tools Set ($89.99)"

## Running the Demo

To test these examples yourself:

1. **Start the database**:
   ```bash
   docker-compose up -d
   ```

2. **Test the MCP server**:
   ```bash
   node test-mcp.mjs
   ```

3. **Try manual queries**:
   ```bash
   node manual-test.mjs
   ```

4. **Connect with Claude Desktop**:
   Use the configuration in `claude-config-example.md`

## Security Features Demonstrated

- ✅ **Read-only operations**: Only SELECT, SHOW, DESCRIBE, EXPLAIN, WITH allowed
- ✅ **Automatic LIMIT**: Queries are limited to prevent large result sets
- ✅ **SQL injection protection**: Parameterized queries for user inputs
- ✅ **Error handling**: Safe error messages without exposing sensitive data

## Clean Up

When done testing:
```bash
docker-compose down
```

This removes the test containers but preserves the data volume for future testing.
