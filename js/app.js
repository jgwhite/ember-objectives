App = Ember.Application.create();

App.SIMPERIUM_APP_ID = 'patch-mechanisms-2e0';
App.SIMPERIUM_TOKEN = '524b96b47f26477897aa2737b28ec47e';

// Initializers

App.initializer({
  name: 'simperium',
  initialize: function() {
    App.simperium = new Simperium(App.SIMPERIUM_APP_ID, {
      token : App.SIMPERIUM_TOKEN
    });
  }
});

App.initializer({
  name: 'stores',
  initialize: function() {
    App.Objective.store = App.ObjectiveStore.create();
    App.User.store = App.UserStore.create();
  }
});


// Routes

App.Router.map(function() {
	this.resource('objectives', function() {
	  this.route('new');
	});
	this.resource('objective', { path: 'objectives/:objective_id' } );
  this.resource('users');
});

App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('objectives');
  }
});

App.ObjectivesRoute = Ember.Route.extend({
  model: function() {
    return App.Objective.find();
  }
});

App.UsersRoute = Ember.Route.extend({
  model: function() {
    return App.User.find();
  }
});


// Models

App.Model = Ember.Object.extend({
  fields: [],

  forWire: function() {
    return this.getProperties(this.get('fields'));
  },

  commit: function() {
    this.get('store').commit(this.get('id'));
  }
});

App.User = App.Model.extend({
  fields: ['id', 'name']
});

App.User.find = function(id) {
  if (Ember.isNone(id)) {
    return App.User.store.all();
  } else {
    return App.User.store.find(id);
  }
}

App.Objective = App.Model.extend({
  fields: ['id', 'name', 'createdAt', 'description', 'coordinates', 'address'],

  addressDidChange: function() {
    var address = this.get('address');
    if (Ember.isEmpty(address)) return;

    var geocoder = new google.maps.Geocoder(),
        self = this;

    geocoder.geocode(this.getProperties('address'), function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        var location = results[0].geometry.location;
        self.set('coordinates', [location.lat(), location.lng()]);
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  }.observes('address')
});

App.Objective.find = function(id) {
  if (Ember.isNone(id)) {
    return App.Objective.store.all();
  } else {
    return App.Objective.store.find(id);
  }
}


// Stores

App.Store = Ember.Object.extend({
  init: function() {
    this._super();
    this.set('idMap', {});
    this.set('hydratedObjects', []);
    this._createBucket();
  },

  all: function() {
    return this.get('hydratedObjects');
  },

  find: function(id) {
    return this._objectFor(id);
  },

  commit: function(id) {
    this.get('bucket').update(id);
  },

  _createBucket: function() {
    var bucket = App.simperium.bucket(this.get('name')),
        self = this;

    bucket.on('notify', function(id, properties) {
      self._hydrateObject(id, properties);
    });

    bucket.on('local', function(id) {
      var object = self.find(id);
      return object.forWire();
    });

    bucket.start();

    this.set('bucket', bucket);
  },

  _objectFor: function(id) {
    var idMap = this.get('idMap');

    return idMap[id] = idMap[id] ||
                       this.get('model').create({ id: id, store: this });
  },

  _hydrateObject: function(id, properties) {
    var object = this._objectFor(id);
    object.setProperties(this.deserialize(properties));
    this.get('hydratedObjects').addObject(object);
  },

  deserialize: function(object, properties) {
    return {};
  }
});

App.UserStore = App.Store.extend({
  name: 'users',
  model: App.User,
  deserialize: function(properties) {
    return {
      id: properties.id,
      name: properties.name
    }
  }
});

App.ObjectiveStore = App.Store.extend({
  name: 'objectives',
  model: App.Objective,
  deserialize: function(properties) {
    return {
      name: properties.name,
      createdAt: Date.parse(properties.createdAt),
      description: properties.description,
      address: properties.address,
      coordinates: properties.coordinates,
      address: properties.address
    }
  }
});


// Views & Helpers

App.MapView = Ember.View.extend({
	didInsertElement: function() {
		var coordinates = this.get( 'coordinates' );
		var latlng = new google.maps.LatLng( coordinates[0], coordinates[1] );
		var mapOptions = {
			zoom: 15,
			center: latlng,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		}
		var element = this.get('element');
		var container = $('<div>', { style: 'width: 200px; height: 200px' });
		container.appendTo(element);
		new google.maps.Map( container[0], mapOptions );
	}
});

Ember.Handlebars.registerBoundHelper('humanDate', function(date) {
	if (!Ember.isNone(date)) return moment(date).fromNow();
});

Ember.Handlebars.registerBoundHelper('latLng', function(coordinates) {
	if (!Ember.isNone(coordinates)) return coordinates.join(',');
});
