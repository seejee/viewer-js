var Omnyx = Omnyx || {};

Omnyx.Viewer = function() {

    var ns = {};

    ns.ImageTile = function ImageTile(image, position) {
      this.image = image;
      this.position = position;
      
      this.drawOn = function(ctx) {
          ctx.drawImage(image, position.x, position.y);
      };
    };
    
    ns.ImageTile.fromRgbBuffer = function (width, height, position, setBytesCallback) {
      var cvs = document.createElement("canvas");
      var ctx = cvs.getContext("2d");
      var imageData = ctx.createImageData(width, height);
    
      cvs.width = width;
      cvs.height = height;
    
      setBytesCallback(imageData.data);
      ctx.putImageData(imageData, 0, 0);
    
      return new ns.ImageTile(cvs, position);
    };
    
    ns.ImageTile.fromImage = function (src, position, tileCallback) {
      var im = new Image();
      im.onload = function(ev) {
          tileCallback(new ns.ImageTile(im, position));
      };
      im.src = src;
    };

    ns.Viewer = function Viewer(c) {
      this.canvas = c;
      this.ctx = this.canvas.getContext("2d");
      this.scale = 1;
      this.tiles = new Array();
      this.isPanning = false;
      this.translate = {
          x: 0,
          y: 0
      };
      this.lastPosition = {
          x: 0,
          y: 0
      };

      this.addTile = function(tile, position) {
          this.tiles.push(tile);
          this.draw();
      };

      this.draw = function() {
          var ctx = this.ctx;
          var canvas = this.canvas;
          var scale = this.scale;
          var tiles = this.tiles;

          ctx.save();

          ctx.scale(scale, scale);
          ctx.translate(this.translate.x, this.translate.y);
          ctx.clearRect( -canvas.width * 2, -canvas.height * 2, canvas.width * 4, canvas.height * 4);

          for (idx in tiles) {
              var tile = tiles[idx];
              tile.drawOn(ctx);
          }

          ctx.restore();
      };

      this.zoom = function(direction) {
          this.scale *= ((direction > 0) ? 0.83333333333: 1.2);
          this.draw();
      };

      this.panRelative = function(position) {
          if (this.isPanning == false) return;

          this.translate.x += position.x - this.lastPosition.x;
          this.translate.y += position.y - this.lastPosition.y;
          this.lastPosition = position;
          this.draw();
      };

      this.panAbsolute = function(position) {
          this.translate.x += position.x;
          this.translate.y += position.y;
          this.lastPosition = position;
          this.draw();
      };

      this.startPanning = function(position) {
          this.isPanning = true;
          this.lastPosition = position;
      };

      this.stopPanning = function() {
          this.isPanning = false;
      };
    };

    ns.bindViewerToMouse = function(selector, viewer) {
        selector.mousewheel(function(ev, delta) {
            viewer.zoom(delta);
        });

        selector.mousedown(function(ev) {
            viewer.startPanning({
                x: ev.pageX,
                y: ev.pageY
            });
        });

        selector.mousemove(function(ev) {
            viewer.panRelative({
                x: ev.pageX,
                y: ev.pageY
            });
        });

        selector.mouseup(function(ev) {
            viewer.stopPanning();
        });
    };

    ns.bindViewerToKeyboard = function(selector, viewer) {
        selector.keypress(function(ev) {
            switch (ev.which) {
            case 100:
                //right arrow
                viewer.panAbsolute({
                    x:
                    100,
                    y: 0
                });
                break;
            case 97:
                //left arrow
                viewer.panAbsolute({
                    x:
                    -100,
                    y: 0
                });
                break;
            }
        });
    };

    return ns;
} ();

$(function() {
    var canvas = $("#viewer");

    var viewer = new Omnyx.Viewer.Viewer(canvas[0]);
    Omnyx.Viewer.bindViewerToMouse(canvas, viewer);
    Omnyx.Viewer.bindViewerToKeyboard($(document), viewer);

    Omnyx.Net.downloadBinaryData('content/tile.raw', function(bytes) {
        console.log("downloaded data");

        var tile = Omnyx.Viewer.ImageTile.fromRgbBuffer(3296, 2472, {x: 0, y: 0}, function(imageData) {
            var bayerToRgb = new Omnyx.Decoding.BayerToRgbaConverter();
            bayerToRgb.convertInto(bytes, imageData, 3296, 2472);
            console.log("converted to rgb");
        });
    
        viewer.addTile(tile);
        console.log("drawn");
    });
});