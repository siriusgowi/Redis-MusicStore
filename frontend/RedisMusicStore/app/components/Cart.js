import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  SwipeableFlatList,
  TouchableOpacity,
  Animated,
  Button,
  Alert
} from 'react-native';

import CartItem from './CartItem';

export default class Cart extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      items: [],
      location: null,
      timestamp: null,
    };

    this.clearCart = this.clearCart.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.placeOrder = this.placeOrder.bind(this);
    this.setTotal = this.setTotal.bind(this);
  }

  clearCart()
  {
    var userId = 'myUserId';

    fetch('http:192.168.1.3:13013/store/clearCart', {
      method: 'POST',
      headers: {
         'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'id': userId
      }),
    }).then(res => res.json()
  ).then(data => {
    if (data <= 0)
    {
      throw "Could not clear your cart at this time";
    } else {
        this.setState({ items: [] });
    }
  }).catch((error) => {
     alert(error.message);
  });

  this.setTotal();
  }

  componentDidMount()
  {
    var userId = 'myUserId';

    fetch('http:192.168.1.3:13013/store/cart', {
      method: 'POST',
      headers: {
         'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'id': userId
      }),
    }).then(res => res.json()
  ).then(data => {
    this.setState({ items: data });
    this.setTotal();
  }).catch((error) => {
     alert(error.message);
  });

    this.props.navigation.setParams({ clearButton: this.clearCart });
  }

  _renderItem = ({item}) => (
    <View style={styles.row}>
    <CartItem
      name={item.name}
      price={item.price}
      quantity={item.quantity}
      />
      </View>
    );

    setTotal()
    {

      // gets user location
      navigator.geolocation.getCurrentPosition(
            (position) => {
              this.setState({
                location: [position.coords.latitude, position.coords.longitude],
                timestamp: position.timestamp
              });
            },
            (error) => this.setState({ location: [], timestamp: null }),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
          );

      let items = this.state.items;
      var total = 0;
      for (var i = 0; i < items.length; i++)
      {
        total += items[i].price * items[i].quantity;
      }
      this.setState({
        total: total.toFixed(2)
      });
    }


    removeItem(id, name, price) {
      let userId = 'myUserId';
      let product = id + ":" + name + ":" + price;

      fetch('http:192.168.1.3:13013/store/removeFromCart', {
        method: 'POST',
        headers: {
           'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'id': userId,
          'item': product
        }),
      }).then(res => res.json()
    ).then(data => {

      if (data === 1)
      {
        Alert.alert('Item removed from cart!');
      } else {
        throw {message: "could not remove item from cart"};
      }
    }).catch((error) => {
       alert(error.message);
    });

    let items = this.state.items;

    for (var x = 0; x < items.length; x++)
    {
      if (id === items[x].productid)
      {
        items.splice(x, 1);
        break;
      }
    }

    this.setState({
      refresh: Math.random()
    });

    this.setTotal();

    }

    placeOrder()
    {
      Alert.alert('Order Placed! Thank you.');
    }

    _keyExtractor = (item, index) => item.productid.toString();

    _renderQuickActions = ({item}) => (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => this.removeItem(item.productid, item.name, item.price)}>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

  static navigationOptions = ({ navigation }) => {
    return {
      headerTitle: 'Cart 🛒',
      headerRight: (
        <Button
          title="❌"
          onPress={navigation.getParam('clearButton')}
          />
      ),
    };
  };

  render() {
    return (
    <View>
      <SwipeableFlatList
        extraData={this.state}
        style={styles.list}
        data={this.state.items}
        keyExtractor={this._keyExtractor}
        bounceFirstRowOnMount={true}
        maxSwipeDistance={80}
        renderItem={this._renderItem}
        renderQuickActions={this._renderQuickActions}
        />
    <View style={styles.orderView}>
    <Text style={styles.totalText}>Total: ${this.state.total}</Text>
    <Button title="Order" style={styles.orderButton} onPress={this.placeOrder}/>
    </View>
    </View>
  );
  } 

}

const styles = StyleSheet.create({
  totalText: {
    paddingTop: 5,
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    justifyContent: 'center'
  },
  orderView: {
    backgroundColor: 'rgba(52, 52, 52, 0.9)',
    flex: 1,
    bottom: 0,
    width: '100%',
    height: '20%',
    position: 'absolute',
    flexDirection: 'column',
    textAlign: 'center',
    justifyContent: 'center',
  },
  orderButton: {
    fontWeight: 'bold',
    fontSize: 24,
    width: '100%',
  },
  list: {
    width: '100%',
    height: '100%'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F6F6F6',
  },
  actionsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FF0000'
  },
  actionButton: {
    padding: 15,
    paddingLeft: 0,
    backgroundColor: '#FF0000',
  },
  actionButtonText: {
    textAlign: 'center',
  },
});
