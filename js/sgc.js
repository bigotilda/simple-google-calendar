// The main app, using Backbone.js

$(function(){
  // the event model
  var CalEvent = Backbone.Model.extend({
    defaults: function(){
      return {
        start: new Date(),
        duration: 60,
        title: 'Default Event',
        all_day: false
        // add any more values we want to model from the google calendar event object here
      }
    }
  });
  
  // the list of event instances
  var CalEventList = Backbone.Collection.extend({
    model: CalEvent,
    comparator: 'start'
  });
  var CalEvents = new CalEventList;
  
  // view for an event
  var CalEventView = Backbone.View.extend({
    tagName: 'div',
    
    template: _.template($('#event-template').html(), {variable: 'calevent'}),
    
    events: {
    },
    
    initialize: function(){
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },
    
    render: function(){
      this.$el.html(this.template(this.model.attributes));
      return this;
    }
  });
  
  // the application view @TODO
  var AppView = Backbone.View.extend({
    el: $('#sgc-app'),
    
    events: {
      
    },
    
    initialize: function(){
      this.input = this.$('#cal-date');
      this.container = this.$('#event-container');
      
      this.listenTo(CalEvents, 'reset', this.render);
      // @TODO maybe put the google auth stuff here?
    },
    
    render: function(){
      this.$('.calevent').remove();
      CalEvents.each(this.addEvent, this);
    },
    
    addEvent: function(calevent){
      var view = new CalEventView({model: calevent});
      this.container.append(view.render().el);
    }
  });
  
  var App = new AppView();
  
  /// @TODO TESTING
  var ev1 = new CalEvent();
  var ev2 = new CalEvent({start: new Date('2014-11-02 00:00:00'), duration: 90, title: 'Future Event'});
  var ev3 = new CalEvent({start: new Date(), duration: 90, title: 'Future Woohoo Event'});
  CalEvents.reset([ev1, ev2, ev3]);
});