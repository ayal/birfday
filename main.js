import * as THREE from './three.module.js';
import { GeometryUtils } from './GeometryUtils.js';

THREE.Cache.enabled = true;

var container, permalink, hex;

var camera, cameraTarget, scene, renderer;

var group, textMesh1, textMesh2, textGeo, materials;

var firstLetter = true;

var text = "0202|2020",

    height = 20,
    size = 26,
    hover = 30,

    curveSegments = 4,

    bevelThickness = 2,
    bevelSize = 1.5,
    bevelEnabled = true,

    font = undefined,

    fontName = "optimer", // helvetiker, optimer, gentilis, droid sans, droid serif
    fontWeight = "bold"; // normal bold

var mirror = true;

var fontMap = {

  "helvetiker": 0,
  "optimer": 1,
  "gentilis": 2,
  "droid/droid_sans": 3,
  "droid/droid_serif": 4

};

var weightMap = {

  "regular": 0,
  "bold": 1

};

var reverseFontMap = [];
var reverseWeightMap = [];

for ( var i in fontMap ) reverseFontMap[ fontMap[ i ] ] = i;
for ( var i in weightMap ) reverseWeightMap[ weightMap[ i ] ] = i;

var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;

var windowHalfX = window.innerWidth / 2;

var fontIndex = 1;

init();
animate();

function decimalToHex( d ) {

  var hex = Number( d ).toString( 16 );
  hex = "000000".substr( 0, 6 - hex.length ) + hex;
  return hex.toUpperCase();

}

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );


  // CAMERA

  camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 1500 );
  camera.position.set( 0, 400, 700 );

  cameraTarget = new THREE.Vector3( 0, 150, 0 );

  // SCENE

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x000000 );
  scene.fog = new THREE.Fog( 0x000000, 250, 1400 );

  // LIGHTS

  var dirLight = new THREE.DirectionalLight( 0xffffff, 0.125 );
  dirLight.position.set( 0, 0, 1 ).normalize();
  scene.add( dirLight );

  var pointLight = new THREE.PointLight( 0xffffff, 1.5 );
  pointLight.position.set( 0, 100, 90 );
  scene.add( pointLight );

  // Get text from hash

  var hash = document.location.hash.substr( 1 );

  if ( hash.length !== 0 ) {

    var colorhash = hash.substring( 0, 6 );
    var fonthash = hash.substring( 6, 7 );
    var weighthash = hash.substring( 7, 8 );
    var bevelhash = hash.substring( 8, 9 );
    var texthash = hash.substring( 10 );

    hex = colorhash;
    pointLight.color.setHex( parseInt( colorhash, 16 ) );

    fontName = reverseFontMap[ parseInt( fonthash ) ];
    fontWeight = reverseWeightMap[ parseInt( weighthash ) ];

    bevelEnabled = parseInt( bevelhash );

    text = decodeURI( texthash );


  } else {

    pointLight.color.setHSL( Math.random(), 1, 0.5 );
    hex = decimalToHex( pointLight.color.getHex() );

  }

  materials = [
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // front
    new THREE.MeshPhongMaterial( { color: 0xffffff } ) // side
  ];

  group = new THREE.Group();
  group.position.y = 100;

  scene.add( group );

  loadFont();


  // RENDERER

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  // EVENTS

  document.addEventListener( 'mousedown', onDocumentMouseDown, false );
  document.addEventListener( 'touchstart', onDocumentTouchStart, false );
  document.addEventListener( 'touchmove', onDocumentTouchMove, false );
  document.addEventListener( 'keypress', onDocumentKeyPress, false );
  document.addEventListener( 'keydown', onDocumentKeyDown, false );

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  windowHalfX = window.innerWidth / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function boolToNum( b ) {

  return b ? 1 : 0;

}


function onDocumentKeyDown( event ) {

  if ( firstLetter ) {

    firstLetter = false;
    text = "";

  }

  var keyCode = event.keyCode;

  // backspace

  if ( keyCode == 8 ) {

    event.preventDefault();

    text = text.substring( 0, text.length - 1 );
    refreshText();

    return false;

  }

}

function onDocumentKeyPress( event ) {

  var keyCode = event.which;

  // backspace

  if ( keyCode == 8 ) {

    event.preventDefault();

  } else {

    var ch = String.fromCharCode( keyCode );
    text += ch;

    refreshText();

  }

}

function loadFont() {

  var loader = new THREE.FontLoader();
  loader.load( '/node_modules/three/examples/fonts/' + fontName + '_' + fontWeight + '.typeface.json', function ( response ) {

    font = response;

    refreshText();

  } );

}

function createText() {

  textGeo = new THREE.TextGeometry( text, {

    font: font,

    size: size,
    height: height,
    curveSegments: curveSegments,

    bevelThickness: bevelThickness,
    bevelSize: bevelSize,
    bevelEnabled: bevelEnabled

  } );

  textGeo.computeBoundingBox();
  textGeo.computeVertexNormals();

  var triangle = new THREE.Triangle();

  // "fix" side normals by removing z-component of normals for side faces
  // (this doesn't work well for beveled geometry as then we lose nice curvature around z-axis)

  if ( ! bevelEnabled ) {

    var triangleAreaHeuristics = 0.1 * ( height * size );

    for ( var i = 0; i < textGeo.faces.length; i ++ ) {

      var face = textGeo.faces[ i ];

      if ( face.materialIndex == 1 ) {

	for ( var j = 0; j < face.vertexNormals.length; j ++ ) {

	  face.vertexNormals[ j ].z = 0;
	  face.vertexNormals[ j ].normalize();

	}

	var va = textGeo.vertices[ face.a ];
	var vb = textGeo.vertices[ face.b ];
	var vc = textGeo.vertices[ face.c ];

	var s = triangle.set( va, vb, vc ).getArea();

	if ( s > triangleAreaHeuristics ) {

	  for ( var j = 0; j < face.vertexNormals.length; j ++ ) {

	    face.vertexNormals[ j ].copy( face.normal );

	  }

	}

      }

    }

  }

  var centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

  textGeo = new THREE.BufferGeometry().fromGeometry( textGeo );

  textMesh1 = new THREE.Mesh( textGeo, materials );

  textMesh1.position.x = centerOffset;
  textMesh1.position.y = hover;
  textMesh1.position.z = 0;

  textMesh1.rotation.x = 0;
  textMesh1.rotation.y = Math.PI * 2;

  group.add( textMesh1 );

  if ( mirror && false ) {
    
    textMesh2 = new THREE.Mesh( textGeo, materials );

    textMesh2.position.x = centerOffset + 80;
    textMesh2.position.y = hover;
    textMesh2.position.z = height;

    textMesh2.rotation.x = 0;
    textMesh2.rotation.y = -Math.PI;

    group.add( textMesh2 );

  }

}

function refreshText() {

  group.remove( textMesh1 );
  if ( mirror ) group.remove( textMesh2 );

  if ( ! text ) return;

  createText();

}

function onDocumentMouseDown( event ) {

  event.preventDefault();

  document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  document.addEventListener( 'mouseup', onDocumentMouseUp, false );
  document.addEventListener( 'mouseout', onDocumentMouseOut, false );

  mouseXOnMouseDown = event.clientX - windowHalfX;
  targetRotationOnMouseDown = targetRotation;

}

function onDocumentMouseMove( event ) {

  mouseX = event.clientX - windowHalfX;

  targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.02;

}

function onDocumentMouseUp() {

  document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
  document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
  document.removeEventListener( 'mouseout', onDocumentMouseOut, false );

}

function onDocumentMouseOut() {

  document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
  document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
  document.removeEventListener( 'mouseout', onDocumentMouseOut, false );

}

function onDocumentTouchStart( event ) {

  if ( event.touches.length == 1 ) {

    event.preventDefault();

    mouseXOnMouseDown = event.touches[ 0 ].pageX - windowHalfX;
    targetRotationOnMouseDown = targetRotation;

  }

}

function onDocumentTouchMove( event ) {

  if ( event.touches.length == 1 ) {

    event.preventDefault();

    mouseX = event.touches[ 0 ].pageX - windowHalfX;
    targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.05;

  }

}

//

function animate() {

  requestAnimationFrame( animate );

  render();

}

function render() {
  if (!targetRotation) {
    targetRotation = 0.6;
  }
  group.rotation.y += ( targetRotation - group.rotation.y ) * 0.05;

  camera.lookAt( cameraTarget );

  renderer.clear();
  renderer.render( scene, camera );

}
