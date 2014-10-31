// Lifted this idea (with slight modifications) for easily outputting a date value acceptable for use in a date input from
// http://stackoverflow.com/questions/6982692/html5-input-type-date-default-value-to-today

// I believe in attributing ideas, and when I need a quick solution if I can find one that
// someone has already done well, I'm generally happy to learn, understand, and then use it, so
// I can more quickly move to the next challenge.

// Extend Date to output a value acceptable for date input field
Date.prototype.toDateInputValue = (function() {
  var local = new Date(this);
  local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
  return local.toISOString().substr(0,10);
});