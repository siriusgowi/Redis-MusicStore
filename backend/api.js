const redisdb = require('redis');
const mysqldb = require("mysql");
const express = require('express');

// Create Express router to route to index.js express app
const router = express.Router();

// PORT & HOST
var redisPORT = '6379';
var sqlPORT = '3306';
var HOST = '127.0.0.1'

// Redis client
let redis = redisdb.createClient(redisPORT, HOST, {no_ready_check: true});

// MySQL client
var mysql = mysqldb.createConnection({
 host: HOST,
 user: 'root',
 password: 'password',
 database: 'MusicStore',
 port: sqlPORT,
 allowMultipleStatements: true
});

mysql.connect((err) => {
  if (err) {
    throw err;
  } else {
    console.log('Successful connection to MySQL on port ' + sqlPORT)
  }
});

redis.on('connect', function() {
  console.log('Successful connection to Redis on port ' + redisPORT);
});

/*
 *  Gets a users cart (Redis Cache)
 */
router.post('/cart', function(req, res) {
  let id = req.body.id;

  redis.zrange('cart_' + id, 0, -1, 'WITHSCORES', function(err, obj) {
    if (obj)
    {
      let cart = listToCart(obj);
      let jsonCart = parseson(cart);
      res.status(200).json(jsonCart);
    } else {
      res.status(400).json(err);
    }
  });
});

/*
 *  Adds Item to Cart (Redis Cache - Sorted Set)
 *    - holds "productid:name:price" as value (delimited in Redis by colons)
 *    - holds "quantity" as score (sorted list in Redis)
 */
router.post('/addToCart', function(req, res) {
  let id = req.body.id;
  let item = req.body.item;
  let productInfo = item.productid + ":" + item.name + ":" + item.price;

  // if item is NOT in cache
  if (checkScore(id, productInfo) === 0)
  {

		redis.zadd('cart_' + id, item.quantity, productInfo, function(err, obj) {
      if (obj)
      {
        res.status(200).json(obj);
      } else {
        res.status(400).json(err);
      }
  });

// if item IS already in cache
} else {

 if (incQuantity(id, productInfo) === 0)
 {
    res.status(400).json({
      error: 'Something went wrong...'
    });
  } else {
    res.status(200).json(1);
  }

}

});

/*
 *  Removes item from cart (Redis Cache)
 */
router.post('/removeFromCart', function(req, res) {
  let id = req.body.id;
  let item = req.body.item;

  redis.zrem('cart_' + id, item, function(err, obj) {
    if (obj)
    {
      res.status(200).json(obj);
    } else {
      res.status(400).json(err)
    }
  });

});

/*
 *  Clears a users cart (Redis Cache)
 */
router.post('/clearCart', function(req, res) {
  let id = req.body.id;
  redis.del('cart_' + id, function(err, obj) {
    if (obj)
    {
      res.json(obj);
    } else {
      res.json({
        status: obj
      });
    }
  });
});

/*
 *  Gets all products from MySQL database
 */
router.post('/products', function(req, res){

  let department = req.body.department;
  let query = "SELECT * FROM Products WHERE department = '" + department + "'";

  mysql.query(query, function(error, results, fields) {

      if (error)
      {
        res.status(400).json(error);
      } else {
        res.status(200).json(results);
      }
});
});

/*
 *  Places order inserting into MySQL database
 */
router.post('/order', function(req, res) {

  let id = req.body.id;
  let total = req.body.total;
  let items = req.body.items;

  let query = "INSERT INTO Orders VALUES (NULL, '" + id + "', " + total + ", NOW());";

  mysql.query(query, function(error, results, fields) {
      if (error)
      {
        res.status(400).json(error);
      } else {
        let orderId = results.insertId;
        let args = formatValues(orderId, items);
        let query1 = "INSERT INTO OrderItems VALUES " + args + ";";
        mysql.query(query1, function(error, results, fields) {
          if (error)
          {
            res.status(400).json(error);
          } else {
            res.status(200).json(results);
          }
        });
      }
});

});

/*
 *  Checks if item is already in cart (Redis Cache)
 */
function checkScore(id, value)
{
  redis.ZSCORE('cart_' + id, value, function(err, obj) {
    if (obj > 0)
    {
        return 1;
    } else {
      return 0;
    }
  });
}

/*
 *  Increments the quantity of an item in Redis Cache
 */
function incQuantity(id, product)
{
    redis.ZINCRBY("cart_" + id, 1, product, function(err, obj) {
        if (obj)
        {
          return 1;
        } else {
          return 0;
        }
      });
}

/*
 *  Formats all OrderItems to be inserted for an Order
 */
function formatValues(id, items)
{
  var newItems = "";
  for (var i = 0; i < items.length; i++)
  {
    if (i != items.length-1)
    {
      newItems += "(" + id + ", " + items[i].productid + ", " + items[i].quantity + "), ";
    } else {
      newItems += "(" + id + ", " + items[i].productid + ", " + items[i].quantity + ")";
    }
  }

  return newItems;
}

/*
 *  Converts Sorted Set to a list of string encoded json objects
 */
function listToCart(list)
{
  var cart = [];
  var i, q;
  for (i = 0, q = 1; i < list.length; i+=2, q+=2)
  {
    let productDetail = list[i].split(":");

    var product = {
        productid: parseInt(productDetail[0]),
        name: productDetail[1],
        price: (Math.round(productDetail[2] * 100) / 100),
        quantity: list[q]
    };
    cart.push(JSON.stringify(product));
  }

  return cart;
}

/*
 *  Parses Redis List of String encoded json objects
 *  and returns a list of json objects
 */
function parseson(list)
{
  var newList = [];

  list.forEach(function(value) {
      newList.push(JSON.parse(value));
  })
  return newList;
}

module.exports = router;
