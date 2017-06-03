// Dependencies
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var notify = require('gulp-notify');
var livereload = require('gulp-livereload');
 
// Task
gulp.task('default', () =>
{
    // listen for changes
    livereload.listen();

    // configure nodemon
    nodemon({
         // the script to run the app
         script: 'bin/www',
	 ext: 'js'
    })
    .on('restart', () =>
    {
	// when the app has restarted, run livereload.
	gulp.src('app.js')
	.pipe(livereload())
	.pipe(notify('Reloading page, please wait...'));
    })
})