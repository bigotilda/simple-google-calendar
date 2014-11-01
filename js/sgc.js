// The main app, using Backbone.js

$(function(){
  // the event model
  var CalEvent = Backbone.Model.extend({
    defaults: function(){
      var now = new Date();
      return {
        start: now,
        end: new Date(now.getTime() + (3600 * 1000)), // 1 hour later
        title: 'Default Event',
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
  
  
  // the application view
  var AppView = Backbone.View.extend({
    el: $('#sgc-app'),
    
    events: {
      'click #cal-go': 'refreshDate',
      'click #cal-new': 'addNewEvent'
    },
    
    initialize: function(){
      this.input = this.$('#cal-date');
      this.input.val(new Date().toDateInputValue());
      this.container = this.$('#event-container');
      this.authbutton = this.$('#authorize');
      this.neweventform = this.$('#new-event-container');
      this.newbutton = this.$('#cal-new');
      this.neweventdesc = this.$('#cal-new-desc');
      
      // simple array of calevents that will then be assigned in batch to CalEvents via CalEvents.reset()
      this.calevents = [];
      
      // Users may add/remove calendars from their Google calendar list while interacting with this app, but to keep things
      // simpler and  faster, we'll cache the calendarlist the first time, and just use that; otherwise I think we'd have to 
      // get the calendar list every time we want to get a set of events for a date.
      this.calendarlist = null;
      
      // listen for reset event on our CalEventList instance
      this.listenTo(CalEvents, 'reset', this.render);
      
      if (gapiIsLoaded)
        this.checkAuth(this.authInfo.scopeReadOnly, true);
      else
        this.listenForApi();
    },
    
    render: function(){
      this.$('.calevent').remove();
      CalEvents.each(this.addEvent, this);
    },
    
    addEvent: function(calevent){
      var view = new CalEventView({model: calevent});
      this.container.append(view.render().el);
    },
    
    listenForApi: function(){
      // @NOTE I'm aware that I'm using two different ways of handling the value of 'this'... here I use another variable, and 
      // further below I use $.proxy()...normally I would consistently do one way in code, but for illustration purposes I'm doing both
      var theApp = this;
      $(document).on(GAPI_LOADED_EV, function(e){
        theApp.checkAuth(theApp.authInfo.scopeReadOnly, true);
      })
    },
    
    // @NOTE I defined the project on the Google Developers Console to expect to be running from http://localhost (Javascript Origins setting)
    authInfo: {
      clientID: '205919807575-2p3tlh5i5pi93lm8r96ufq6jup14179v.apps.googleusercontent.com',
      scopeReadOnly: 'https://www.googleapis.com/auth/calendar.readonly',
      scopeReadWrite: 'https://www.googleapis.com/auth/calendar'
    },
    
    checkAuth: function(scope, immediate){
      gapi.auth.authorize({client_id: this.authInfo.clientID, scope: scope, immediate: immediate}, $.proxy(this.handleAuthResult, this));
    },
    
    handleAuthResult: function(authResult){
      // hide the auth button and show the new event form on success, otherwise vice versa
      if (authResult && !authResult.error){
        this.authbutton.addClass('hidden');
        this.neweventform.removeClass('hidden');
        this.apiEventsForDate(this.input.val());
      } else {
        this.authbutton.removeClass('hidden');
        this.neweventform.addClass('hidden');
        this.authbutton.one('click', $.proxy(this.handleAuthClick, this));
        // for this simple app, just put message and info to console on auth error...
        console.log('auth error!');
        console.log(authResult);
      }
    },
    
    handleAuthClick: function(e){
      this.checkAuth(this.authInfo.scopeReadOnly, false);
    },
    
    apiEventsForDate: function(date){
      var theApp = this;
      gapi.client.load('calendar', 'v3', function(){
        // initialize the calendarlist if needed
        if (!theApp.calendarlist){
          var request = gapi.client.calendar.calendarList.list();
          request.then(function(resp){
            theApp.setCalendarList(resp.result);
            theApp.apiGetEvents(date);
          }, function(resp){
            console.log('Error getting calendar list!');
            console.log(resp);
          });
        } else {
          theApp.apiGetEvents(date);
        }
      });
    },
    
    apiGetEvents: function(date){
      var theApp = this;
      theApp.calevents = [];
      
      // to track the several async requests
      var reqTotal = theApp.calendarlist.length;
      var reqCount = 0;
      
      // for each google calendar, get events for the specified date, then for each event found, build a CalEvent and add it to
      // theApp.calevents for each, then reset the CalEvents list with theApp.calevents.
      theApp.calendarlist.forEach(function(cal){
        // handle timezone offset
        var localDate = new Date(date);
        var datetime = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60 * 1000));
        var request = gapi.client.calendar.events.list({
          calendarId: cal,
          timeMin: datetime.toISOString(),
          timeMax: new Date(datetime.getTime() + (24 * 3600 * 1000)).toISOString()
        });
        request.then(function(resp){
          resp.result.items.forEach(function(calevent){
            var theStart = calevent.start.dateTime || calevent.start.date;
            var theEnd = calevent.end.dateTime || calevent.end.date; 
            theApp.calevents.push(new CalEvent({
              title: calevent.summary,
              start: new Date(theStart),
              end: new Date(theEnd)
            }));
          });
          reqCount++;
          
          // if we now have requests for all calendars finished, then finally batch update the CalEvents list
          if (reqCount == reqTotal){
            CalEvents.reset(theApp.calevents);
          }
        }, function(resp){
          console.log('Error retrieving events for date: ' + date + ' and calendar: ' + cal);
          console.log(resp);
          reqCount++;
        });
      });
    },
    
    setCalendarList: function(calendarlist){
      this.calendarlist = [];
      calendarlist.items.forEach($.proxy(function(cal){
        // just hold the IDs of the calendars for futher API calls
        this.calendarlist.push(cal.id);
      }), this);
    },
    
    refreshDate: function(e){
      this.checkAuth(this.authInfo.scopeReadOnly, true);
      return false;
    },
    
    addNewEvent: function(e){
      if (!this.calendarlist || this.calendarlist.length == 0){
        alert('You have no valid calendars to add to!');
        return false;
      }
      
      if (this.neweventdesc.val() == ''){
        alert('You have not specified a description!');
        return false;
      }
      
      // check for write authorization then do the event creation if we succeed
      var theApp = this;
      gapi.auth.authorize({
        client_id: this.authInfo.clientID,
        scope: this.authInfo.scopeReadWrite, immediate: false
      }, function(authResult){
        if (authResult && !authResult.error){
          console.log('HERE?')
          // @NOTE just default to the first calendar which I think Google always returns your primary calendar first when retrieving the
          // calendar list, but I did not fully verify that....
          var theCalendar = theApp.calendarlist[0];
          console.log(gapi.client.calendar.events);
          console.log(theApp.neweventdesc.val());
          var request = gapi.client.calendar.events.quickAdd({
            calendarId: theCalendar,
            text: theApp.neweventdesc.val()
          });
          request.then(function(resp){
            console.log('success?');
            theApp.neweventdesc.val('');
            theApp.refreshDate();
          }, function(resp){
            console.log('Error creating new event!');
            console.log(resp);
          });

        } else {
          // for this simple app, just put message and info to console on auth error...
          console.log('auth write error!');
          console.log(authResult);
          alert('Failed to gain write authorization to your primary google calendar!')
        }
      });
      
      return false;      
    }
  });
  
  var App = new AppView();
  
  /// @TODO TESTING
  /*var ev1 = new CalEvent();
  var ev2 = new CalEvent({start: new Date('2014-11-02 00:00:00'), end: new Date('2014-11-02 01:00:00'), title: 'Future Event'});
  var ev3 = new CalEvent({start: new Date(), end: new Date(new Date().getTime() + (3600 * 1000)), title: 'Future Woohoo Event'});
  CalEvents.reset([ev1, ev2, ev3]);*/
});