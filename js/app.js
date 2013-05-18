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
  }
});


// Routes

App.Router.map(function() {
	this.resource('objectives');
	this.resource('objective', { path: 'objectives/:objective_id' } );
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


// Models

App.User = Ember.Object.extend();

App.Objective = Ember.Object.extend({
  fields: ['id', 'name', 'createdAt', 'description', 'coordinates'],

  forWire: function() {
    return this.getProperties(this.get('fields'));
  },

  commit: function() {
    this.get('store').commit(this.get('id'));
  }
});

App.Objective.find = function(id) {
  if (Ember.isNone(id)) {
    return App.Objective.store.all();
  } else {
    return App.Objective.store.find(id);
  }
}


App.ObjectiveStore = Ember.Object.extend({
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
    var bucket = App.simperium.bucket('objectives'),
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
                       App.Objective.create({ id: id, store: this });
  },

  _hydrateObject: function(id, properties) {
    var object = this._objectFor(id);

    object.setProperties({
      name: properties.name,
      createdAt: Date.parse(properties.createdAt),
      description: properties.description,
      coordinates: properties.coordinates,
      isLoaded: true
    });

    this.get('hydratedObjects').addObject(object);
  }

});

App.MapView = Ember.View.extend({
	didInsertElement: function() {
		var coordinates = this.get( 'context.coordinates' );
		var latlong = new google.maps.LatLng( coordinates[0], coordinates[1] );
		var mapOptions = {
			zoom: 15,
			center: latlng,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		}
		var element = this.get('element');
		google.maps.Map( element, mapOptions );
	}
});

Ember.Handlebars.registerBoundHelper('humanDate', function(date) {
	if (!Ember.isNone(date)) return moment(date).fromNow();
});

Ember.Handlebars.registerBoundHelper('latLng', function(coordinates) {
	if (!Ember.isNone(coordinates)) return coordinates.join(',');
});
