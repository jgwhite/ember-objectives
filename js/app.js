App = Ember.Application.create();

// Initializers

App.initializer({
  name: 'stores',
  initialize: function() {
    App.Objective.store = App.Store.create();
  }
});

App.initializer({
  name: 'simperium',
  initialize: function() {
    App.simperium = new Simperium('patch-mechanisms-2e0', {
      token : '524b96b47f26477897aa2737b28ec47e'
    });

    App.objectivesBucket = App.simperium.bucket('objectives');

    App.objectivesBucket.on('notify', function(id, data) {
      var objective = App.Objective.create({
        id: id,
        name: data.name
      });
      App.Objective.store.addObject(id, objective);
    });

    App.objectivesBucket.start();
  }
});


// Routes

App.Router.map(function() {
  this.resource('objectives');
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

App.Objective = Ember.Object.extend();
App.Objective.find = function(id) {
  if (Ember.isNone(id)) {
    return App.Objective.store.all();
  } else {
    return App.Objective.store.find(id);
  }
}

App.Store = Ember.Object.extend({
  init: function() {
    this._super();
    this.set('idMap', Ember.Object.create());
    this.set('list', []);
  },

  all: function() {
    return this.get('list');
  },

  find: function(id) {
    return this.get('idMap').get(id);
  },

  addObject: function(id, object) {
    this.get('idMap').set(id, object);
    this.get('list').addObject(object);
  }
});
