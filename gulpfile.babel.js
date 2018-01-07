const gulp = require('gulp');
const {spawn} = require('child_process');
// Load plugins
const gulpLoadPlugins = require('gulp-load-plugins');
// Hugo and utilities
const hugoBin = require('hugo-bin');
// const gutil =  require('gulp-util');
// Babel
const babel = require('gulp-babel');
// PostCSS
const postcss = require('gulp-postcss');
// Autoprefixer
const autoprefixer = require('autoprefixer');
// Browsersync
const BrowserSync = require('browser-sync');
// Webpack
// const webpack = require('webpack');
const webpack = require('webpack-stream');
// eslint
const eslint = require('eslint');
// Sourcemaps
const sourcemaps = require('gulp-sourcemaps');
// SASS
const sass = require('gulp-ruby-sass');
// Critical CSS
const critical = require('critical');
// Imagemin and Plugins
const imagemin = require('gulp-imagemin');
const mozjpeg = require('imagemin-mozjpeg');
// accessibility testing
const axe = require('gulp-axe-webdriver');
// security audit
const snyk = require('gulp-snyk');
// Constants for plugins installed above
const $ = gulpLoadPlugins();
const browserSync = BrowserSync.create();

// Hugo arguments
const hugoArgsDefault = ['-d', '../dist', '-s', 'site', '-v'];
const hugoArgsPreview = ['--buildDrafts', '--buildFuture'];

// SCSS conversion and CSS processing
/**
 * @name sass:dev
 * @description SASS conversion task to produce development css with expanded syntax.
 *
 * We run this task agains Ruby SASS, not lib SASS. As such it requires the SASS Gem to be installed
 *
 * @see {@link http://sass-lang.com|SASS}
 * @see {@link http://sass-compatibility.github.io/|SASS Feature Compatibility}
 */
gulp.task('sass', () =>
  sass('src/sass/**/*.scss', {
    sourcemap: true,
    style: 'expanded'
  })
    .on('error', sass.logError)
    // for inline sourcemaps
    .pipe(sourcemaps.write())
    // for file sourcemaps
    .pipe(gulp.dest('src/css'))
);

/**
 * @name processCSS
 *
 * @description Run autoprefixer and cleanCSS on the CSS files under src/css
 *
 * Moved from gulp-autoprefixer to postcss. It may open other options in the future
 * like cssnano to compress the files
 *
 * @see {@link https://github.com/postcss/autoprefixer|autoprefixer}
 */
gulp.task('processCSS', gulp.series('sass', () => {
  const plugins = [
    autoprefixer({
      browsers: ['last 3 versions']
    })
  ];

  return gulp
    .src('src/css/**/*.css')
    .pipe(sourcemaps.init())
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('site/static/css'));
}));

/**
 * @name uncss
 * @description Taking a css and an html file, UNCC will strip all CSS selectors not used in the page
 *
 * @see {@link https://github.com/giakki/uncss|uncss}
 */
gulp.task('uncss', () => {
  return gulp.src('src/css/**/*.css')
    .pipe($.concat('main.css'))
    .pipe($.uncss({
      html: ['index.html']
    }))
    .pipe(gulp.dest('css/main.css'))
    .pipe($.size({
      pretty: true,
      title: 'Uncss'
    }));
});

// Generate & Inline Critical-path CSS
gulp.task('critical', () => {
  return gulp.src('src/*.html')
    .pipe(critical({
      base: 'src/',
      inline: true,
      css: ['src/css/main.css'],
      minify: true,
      extract: false,
      ignore: ['font-face'],
      dimensions: [{
        width: 320,
        height: 480
      }, {
        width: 768,
        height: 1024
      }, {
        width: 1280,
        height: 960
      }]
    }))
    .pipe($.size({
      pretty: true,
      title: 'Critical'
    }))
    .pipe(gulp.dest('dist'));
});

/**
 * @name babel
 * @description Transpiles ES6 to ES5 using Babel. As Node and browsers support more of the spec natively this will move to supporting ES2016 and later transpilation
 *
 * It requires the `babel` and `babel-preset-env` plugins
 *
 * @see {@link http://babeljs.io/|Babel}
 * @see {@link http://babeljs.io/docs/learn-es2015/|Learn ES2015}
 * @see {@link http://www.ecma-international.org/ecma-262/6.0/|ECMAScript 2015 specification}
 */
gulp.task('babel', () => {
  return gulp.src('src/es6/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('src/js/'))
    .pipe($.size({
      pretty: true,
      title: 'Babel'
    }));
});

gulp.task('js', gulp.series('babel', () => {
  return gulp.src('src/js/**/*.js')
    .pipe(webpack())
    .pipe(gulp.dest('dist/js/'));
}));

/**
 * @name eslint
 * @description Runs eslint on all javascript files
 */
gulp.task('eslint', () => {
  return gulp.src([
    'scr/scripts/**/*.js'
  ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

/**
 * @name jsdoc
 * @description runs jsdoc on the gulpfile and README.md to genereate documentation
 *
 * @see {@link https://github.com/jsdoc3/jsdoc|JSDOC}
 */
gulp.task('jsdoc', () => {
  return gulp.src(['README.md', 'gulpfile.js'])
    .pipe($.jsdoc3());
});

/**
 * @name imagemin
 * @description Reduces image file sizes. Doubly constant if we'll choose to play with responsive images.
 *
 * Imagemin will compress jpg (using mozilla's mozjpeg), SVG (using SVGO) GIF and PNG images but WILL NOT create multiple versions for use with responsive images
 *
 * @see {@link https://github.com/postcss/autoprefixer|Autoprefixer}
 * @see {@link processImages}
 */
gulp.task('imagemin', () => {
  return gulp.src('src/images')
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [
        {removeViewBox: false},
        {cleanupIDs: false}
      ],
      use: [mozjpeg()]
    }))
    .pipe(gulp.dest('static/images'))
    .pipe($.size({
      pretty: true,
      title: 'imagemin'
    }));
});

/**
 * @name processImages
 * @description processImages creates a set of responsive images for each of the PNG and JPG images in the images
 * directory
 *
 * @see {@link http://sharp.dimens.io/en/stable/install/|Sharp}
 * @see {@link https://github.com/jcupitt/libvips|LibVIPS dependency for Mac}
 * @see {@link https://www.npmjs.com/package/gulp-responsive|gulp-responsive}
 * @see {@link imagemin}
 */
gulp.task('processImages', () => {
  return gulp.src(['src/images/**/*.{jpg,png}', '!src/images/touch/*.png'])
    .pipe($.responsive({
      '*': [{
        // image-small.jpg is 200 pixels wide
        width: 200,
        rename: {
          suffix: '-small',
          extname: '.jpg'
        }
      }, {
        // image-small@2x.jpg is 400 pixels wide
        width: 200 * 2,
        rename: {
          suffix: '-small@2x',
          extname: '.jpg'
        }
      }, {
        // image-large.jpg is 480 pixels wide
        width: 480,
        rename: {
          suffix: '-large',
          extname: '.jpg'
        }
      }, {
        // image-large@2x.jpg is 960 pixels wide
        width: 480 * 2,
        rename: {
          suffix: '-large@2x',
          extname: '.jpg'
        }
      }, {
        // image-extralarge.jpg is 1280 pixels wide
        width: 1280,
        rename: {
          suffix: '-extralarge',
          extname: '.jpg'
        }
      }, {
        // image-extralarge@2x.jpg is 2560 pixels wide
        width: 1280 * 2,
        rename: {
          suffix: '-extralarge@2x',
          extname: '.jpg'
        }
      }, {
        // image-small.webp is 200 pixels wide
        width: 200,
        rename: {
          suffix: '-small',
          extname: '.webp'
        }
      }, {
        // image-small@2x.webp is 400 pixels wide
        width: 200 * 2,
        rename: {
          suffix: '-small@2x',
          extname: '.webp'
        }
      }, {
        // image-large.webp is 480 pixels wide
        width: 480,
        rename: {
          suffix: '-large',
          extname: '.webp'
        }
      }, {
        // image-large@2x.webp is 960 pixels wide
        width: 480 * 2,
        rename: {
          suffix: '-large@2x',
          extname: '.webp'
        }
      }, {
        // image-extralarge.webp is 1280 pixels wide
        width: 1280,
        rename: {
          suffix: '-extralarge',
          extname: '.webp'
        }
      }, {
        // image-extralarge@2x.webp is 2560 pixels wide
        width: 1280 * 2,
        rename: {
          suffix: '-extralarge@2x',
          extname: '.webp'
        }
      }, {
        // Global configuration for all images
        // The output quality for JPEG, WebP and TIFF output formats
        quality: 80,
        // Use progressive (interlace) scan for JPEG and PNG output
        progressive: true,
        // Skip enalrgement warnings
        skipOnEnlargement: false,
        // Strip all metadata
        withMetadata: true
      }]
    })
    .pipe(gulp.dest('dist/images')));
});

// AXE CORE A11Y Tests
/**
 * @name axe
 * @description runs Axe A11Y tests on the content.
 */
gulp.task('axe', (done) => {
  const options = {
    saveOutputIn: './a11yReport.json',
    browser: 'phantomjs',
    urls: ['site/*.html']
  };
  return axe(options, done);
});

/**
 * @name snyk:auth
 * @description authorizes user to perform Snyk tests
 */
gulp.task('snyk:auth', (cb) => {
  return snyk({
    command: 'auth',
    debug: true, cb
  });
});

gulp.task('snyk:protect', (cb) => {
  return snyk({
    command: 'protect',
    debug: true,
    test: true, cb
  });
});

gulp.task('snyk:test', (done) => {
  return snyk({
    command: 'test',

    options: {
      debug: true,
      dev: true
    }, done});
});

// Development tasks
gulp.task('hugo', (cb) => buildSite(cb));
gulp.task('hugo-preview', (cb) => buildSite(cb, hugoArgsPreview));

// Build/production tasks
gulp.task('build', gulp.series(('processCSS', 'babel'), (cb) => buildSite(cb, [], 'production')));
gulp.task('build-preview', gulp.series(('processCSS', 'babel'), (cb) => buildSite(cb, hugoArgsPreview, 'production')));

// gulp.task('watch:js', function() {
//   gulp.watch('./src/js/**/*.js', gulp.series('js'));
// });

// gulp.task('watch:css', function() {
//   gulp.watch('./src/css/**/*.css', gulp.series(''));
// });

// gulp.task('watch:site', function() {
//   gulp.watch('./site/**/*', gulp.series('hugo'));
// });

// gulp.task('watch', gulp.parallel('watch:js', 'watch:css', 'watch:site'));

// Development server with browsersync
gulp.task('server', gulp.series(('hugo', 'processCSS', 'babel'), () => {
  browserSync.init({
    server: {
      baseDir: './dist'
    }
  });
}));

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = 'development') {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: 'inherit'}).on('close', (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify('Hugo build failed :(');
      cb('Hugo build failed');
    }
  });
}
