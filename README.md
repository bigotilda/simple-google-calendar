simple-google-calendar
======================

A simple client-side HTML/javascript app to access Google calendar events for a given date, and adding new events. It requires 
a Google authentication by the user (via OAuth2), and then will show events for the selected date, defaulting to the current date.

The user may also add a new event to (@TODO figure out which of the user's calendars to write to).

I've divided up the business logic JS into a few different files, which makes maintenance/development/project-layout more clear, but
comes at the cost of extra HTTP requests to load the several files. In production you could have a preprocessing step of some sort
that compiles the local JS files together into one minified JS download (Ruby on Rails does something similar to this out of the box 
for apps in production mode).

__NOTE__: For this challenge I had to learn Google APIs (Calendar specifically), Google OAuth2, Backbone.js, and SASS all mostly from
scratch as I have never used any of these so far in my professional projects. So yes, it was a *challenge* for sure :)
