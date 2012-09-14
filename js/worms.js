
// ----------------------------------------
// Config
// ----------------------------------------

var Config = {

    COLORS: [
        [349, 99, 63],  // #FE4365
        [25,  86, 83],  // #F9CDAE
        [177, 42, 76],  // #A8DCD9
        [350, 65, 46],  // #C02A43
        [185, 19, 40],  // #537679
        [46,  75, 70],  // #ECD179
        [153, 22, 60]   // #83AF9B
    ],

    SHADOW:               true,
    NUM_WORMS:            40,
    MIN_LENGTH:           5,
    MAX_LENGTH:           35,
    MIN_THICKNESS:        12,
    MAX_THICKNESS:        20,
    MIN_SEGMENT_SPACING:  1,
    MAX_SEGMENT_SPACING:  4
};

// ----------------------------------------
// Catmull Rom Spline
// ----------------------------------------

var CatmullRom = (function() {

    var p0, p1, p2, p3, i6 = 1.0 / 6.0;

    return {

        curveThroughPoints: function( points, ctx ) {

            for ( var i = 3, n = points.length; i < n; i++ ) {

                p0 = points[i - 3];
                p1 = points[i - 2];
                p2 = points[i - 1];
                p3 = points[i];

                ctx.bezierCurveTo(
                    p2.x * i6 + p1.x - p0.x * i6,
                    p2.y * i6 + p1.y - p0.y * i6,
                    p3.x * -i6 + p2.x + p1.x * i6,
                    p3.y * -i6 + p2.y + p1.y * i6,
                    p2.x,
                    p2.y
                );
            }
        }
    };

})();

// ----------------------------------------
// Vector
// ----------------------------------------

function Vector( x, y ) {

	this.set( x, y );
}

Vector.add = function( a, b ) {
	return new Vector( a.x + b.x, a.y + b.y );
};

Vector.sub = function( a, b ) {
	return new Vector( a.x - b.x, a.y - b.y );
};

Vector.scale = function( v, f ) {
	return v.clone().scale( f );
};

Vector.random = function() {
	return new Vector(
		2 * ( Math.random() - 0.5 ),
		2 * ( Math.random() - 0.5 ));
},

Vector.prototype = {

	set: function( x, y ) {
		this.x = x || 0.0;
		this.y = y || 0.0;
		return this;
	},

	add: function( v ) {
		this.x += v.x;
		this.y += v.y;
		return this;
	},

	sub: function( v ) {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	},

	div: function( v ) {
		this.x /= v.x;
		this.y /= v.y;
		return this;
	},

	mag: function() {
		return Math.sqrt( this.x * this.x + this.y * this.y );
	},

	magSq: function() {
		return this.x * this.x + this.y * this.y;
	},

	normalize: function() {

		var mag = Math.sqrt( this.x * this.x + this.y * this.y ) + 0.000001;
		this.x /= mag;
		this.y /= mag;
		return this;
	},

	angle: function() {
		return Math.atan2( this.y, this.x );
	},

	lookAt: function( v ) {

		var mag = this.mag();

		var dx = v.x - this.x;
		var dy = v.y - this.y;
		var theta = Math.atan2( dy, dx );

		this.rotate( theta - this.angle() );
		this.normalize();
		this.scale( mag );
	},

	rotate: function( theta ) {

		var s = sin( theta );
		var c = cos( theta );
		var x = this.x * c - this.y * s;
		var y = this.x * s + this.y * c;

		this.x = x;
		this.y = y;
		return this;
	},

	scale: function( f ) {
		this.x *= f;
		this.y *= f;
		return this;
	},

	copy: function( v ) {
		this.set( v.x, v.y );
		return this;
	},

	clone: function() {
		return new Vector( this.x, this.y );
	}
};

// ----------------------------------------
// Segment
// ----------------------------------------

function Segment( size, head, tail ) {

	this.size = size;
    this.head = head || new Vector();
    this.tail = tail || new Vector( this.head.x + size, this.head.y + size );
}

Segment.prototype = {

	update: function() {

		// Position derivitives
		var dx = this.head.x - this.tail.x;
		var dy = this.head.y - this.tail.y;

		var dist = Math.sqrt( dx * dx + dy * dy );
		var force = 0.5 - this.size / dist * 0.5;
		var strength = 0.998; // No springiness

		force *= 0.99;

		var fx = force * dx;
		var fy = force * dy;

		this.tail.x += fx * strength * 2.0;
		this.tail.y += fy * strength * 2.0;
		this.head.x -= fx * ( 1.0 - strength ) * 2.0;
		this.head.y -= fy * ( 1.0 - strength ) * 2.0;
	}
};

// ----------------------------------------
// Worm
// ----------------------------------------

function Worm( length, thickness, spacing, color ) {

	this.thickness   = thickness || 8;
	this.segments    = [];
	this.spacing     = spacing || 5;
	this.length      = length || 10;
	this.color       = color || '#333333';
	this.nodes       = [];
	this.head        = null;
	this.tail        = null;

	this.meander     = new Vector( 1.0, 1.0 );
	this.jitter      = random( 0.2, 1.5 );

	this.maxForce    = random( 0.08, 0.15 );
	this.velocity    = new Vector();
	this.force       = new Vector();

	this.create();
}

Worm.prototype = {

	create: function() {

		// Build segments
		var node = new Vector();
		var theta;
		var radius;
		var segment;

		this.nodes.push( node );

		for ( var i = 0; i < this.length; i++ ) {

			segment = new Segment( this.spacing, node );
			node = segment.tail;

			theta = i * random( 0.2, 0.6 );
			radius = random( 20, 40 );

			node.x += sin( theta ) * radius;
			node.y += cos( theta ) * radius;

			this.segments.push( segment );
			this.nodes.push( node );
		}

		this.head = this.nodes[0];
		this.tail = this.nodes[ this.nodes.length - 1 ];

		// Start with a random direction
		this.meander.rotate( random( -PI, PI ) );
	},

	setSpacing: function( spacing ) {

		this.spacing = spacing;

		for ( var i = 0, n = this.segments.length; i < n; i++ ) {
			this.segments[i].size = spacing;
		}
	},

	update: function() {

		// Integrate movement
		this.force.normalize();
		this.force.scale( this.maxForce );

		this.velocity.add( this.force );
		this.velocity.scale( 0.985 );
		this.head.add( this.velocity );

		// Reset force
		this.force.set();

		// Inverse Kinematics step
		for ( var i = 0, n = this.segments.length; i < n; i++ ) {
			this.segments[i].update();
		}
	},

	wander: function( multiplier ) {

		this.meander.rotate( random( -this.jitter, this.jitter ) );
		this.force.add( Vector.scale( this.meander, multiplier || 1.0 ) );
	},

	seek: function( target, multiplier ) {

		var desired = Vector.sub( target, this.head );
		var distance = desired.magSq();

		if ( distance > 0.00001 ) {

			var steer = Vector.sub( desired, this.velocity );
			steer.scale( multiplier || 1.0 );

			this.force.add( steer );
		}
	},

	flee: function( target, multiplier ) {

		var desired = Vector.sub( target, this.head );
		var distance = desired.magSq();

		if ( distance > 0.00001 && distance < 100 ) {

			var steer = Vector.sub( this.velocity, desired );
			steer.scale( multiplier || 1.0 );

			this.force.add( steer );
		}
	},

	getBounds: function() {

		var radius = this.thickness * 0.5;
		var node;

		var minX =  999999;
		var minY =  999999;
		var maxX = -999999;
		var maxY = -999999;

		for ( var i = 0, n = this.nodes.length; i < n; i++ ) {

			node = this.nodes[i];

			minX = min( minX, node.x - radius );
			minY = min( minY, node.y - radius );

			maxX = max( maxX, node.x + radius );
			maxY = max( maxY, node.y + radius );
		}

		return {
			x1: minX,
			y1: minY,
			x2: maxX,
			y2: maxY
		};
	},

	draw: function( ctx ) {

		if ( Config.SHADOW ) {

			ctx.beginPath();

			CatmullRom.curveThroughPoints( this.nodes, ctx );

			ctx.strokeStyle = 'rgba(0,0,0,0.1)';
			ctx.lineWidth = this.thickness + 8;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.stroke();
		}

		// Draw
		ctx.beginPath();

		CatmullRom.curveThroughPoints( this.nodes, ctx );

		ctx.strokeStyle = 'hsl(' + this.color[0] + ',' + this.color[1] + '%,' + this.color[2] + '%)';
		ctx.lineWidth = this.thickness;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.stroke();
	},

	drawBounds: function( ctx ) {

		// Debug draw bounds
		var bounds = this.getBounds();
		ctx.beginPath();
		ctx.moveTo( bounds.x1, bounds.y1 );
		ctx.lineTo( bounds.x2, bounds.y1 );
		ctx.lineTo( bounds.x2, bounds.y2 );
		ctx.lineTo( bounds.x1, bounds.y2 );
		ctx.lineTo( bounds.x1, bounds.y1 );
		ctx.strokeStyle = '#ff0000';
		ctx.lineWidth = 1;
		ctx.stroke();
	}
};

// ----------------------------------------
// Sketch
// https://github.com/soulwire/sketch.js
// ----------------------------------------

var worms = [];
var mouse = new Vector();
var center = new Vector();
var ctx = Sketch.create({

	container: document.getElementById( 'container' ),
	interval: 2,

	setup: function() {

		center.set( this.width * 0.5, this.height * 0.5 );

		var length, offset, scale, color, worm;

		for ( var i = 0; i < Config.NUM_WORMS; i++ ) {

			length = random( Config.MIN_LENGTH, Config.MAX_LENGTH );
			thickness = length * random( 0.5, 1.5 );
			color = Config.COLORS[ i % Config.COLORS.length ].concat();

			// Vary Config.HSL
			color[0] += random( -10, 10 );
			color[1] += random( -10, 10 );
			color[2] += random( -10, 10 );

			worm = new Worm(
				length,
				thickness,
				random( Config.MIN_SEGMENT_SPACING, Config.MAX_SEGMENT_SPACING ),
				color
				);

			// Position the worm around the center
			offset = new Vector( random( -300, 300 ), random( -100, 100 ) )
			worm.head.copy( center.clone().add( offset ) );

			// Initial wander
			for ( var j = 0; j < 60; j++ ) {
				worm.wander();
				worm.update();
			}

			worms.push( worm );
		}
	},

	refresh: function() {

		var worm, spacing;

		for ( var i = 0; i < Config.NUM_WORMS; i++ ) {

			worm = worms[i];
			worm.setSpacing( random( Config.MIN_SEGMENT_SPACING, Config.MAX_SEGMENT_SPACING ) );
			worm.thickness = random( Config.MIN_THICKNESS, Config.MAX_THICKNESS );
		}
	},

	update: function() {

		var worm;
		var bounds;

		for ( var i = worms.length - 1; i >= 0; i-- ) {

			worm = worms[i];

			// Apply behaviours
			worm.wander();

			// Move towards center if our of bounds
			bounds = worm.getBounds();

			if ( bounds.x2 < 0 || bounds.x1 > this.width || bounds.y2 < 0 || bounds.y1 > this.height ) {
				worm.seek( center );
			}

			worm.update();
		}
	},

	draw: function() {

		ctx.globalAlpha = 0.92;

		for ( var i = worms.length - 1; i >= 0; i-- ) {
			worms[i].draw( ctx );
		}
	},

	toggle: function() {
		if ( ctx.running ) ctx.stop();
		else ctx.start();
	},

	resize: function() {
		center.set( this.width * 0.5, this.height * 0.5 );
	},

	mousemove: function( e ) {

		mouse.set( e.x, e.y );
	}
});

// ----------------------------------------
// GUI
// ----------------------------------------

var gui = new DAT.GUI();
gui.add( Config, 'MAX_THICKNESS' ).min(1).max(80).name( 'Thickness' );
gui.add( Config, 'MAX_SEGMENT_SPACING' ).min(1).max(20).name( 'Length' );
gui.add( Config, 'SHADOW' ).name( 'Shadow' );
gui.add( ctx, 'toggle' ).name( 'Start / Stop' );
gui.add( ctx, 'refresh' ).name( 'Update' );
