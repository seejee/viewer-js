var Omnyx = function() {

    return {

        Tile: function Tile(image, position)
        {
            this.image = image;
            this.position = position;
        },

        Viewer: function Viewer(c) {

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

            this.addTile = function(image, position) {
                this.tiles.push(new Omnyx.Tile(image, position));
                this.draw();
            };

            this.addImage = function(src, position) {
                var im = new Image();
                var viewer = this;
                im.onload = function(ev) {
                    viewer.addTile(im, position);
                };
                im.src = src;
            };

            this.draw = function() {
                var ctx = this.ctx;
                var canvas = this.canvas;
                var scale = this.scale;
                var tiles = this.tiles;

                ctx.save();
                ctx.scale(scale, scale);
                ctx.translate(this.translate.x, this.translate.y);
                ctx.clearRect( - canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2);

                for (idx in tiles) {
                    var tile = tiles[idx];
                    ctx.drawImage(tile.image, tile.position.x, tile.position.y);
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

            this.startPanning = function() {
                this.isPanning = true;
            };

            this.startPanning = function(position) {
                this.isPanning = true;
                this.lastPosition = position;
            };

            this.stopPanning = function() {
                this.isPanning = false;
            };
        },

        bindViewerToMouse: function(selector, viewer) {
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
        },

        bindViewerToKeyboard: function(selector, viewer) {
            selector.keypress(function(ev) {
                switch (ev.which) {
                case 100:
                    //right arrow
                    viewer.panAbsolute({
                        x: 100,
                        y: 0
                    });
                    break;
                case 97:
                    //left arrow
                    viewer.panAbsolute({
                        x: -100,
                        y: 0
                    });
                    break;
                }
            });

        }
    };
} ();

$(function() {
    var canvas = $("#viewer");

    var viewer = new Omnyx.Viewer(canvas[0]);
    Omnyx.bindViewerToMouse(canvas, viewer);
    Omnyx.bindViewerToKeyboard($(document), viewer);

    viewer.addImage("content/cat.jpg", {
        x: 0,
        y: 0
    });
    viewer.addImage("content/cat.jpg", {
        x: 400,
        y: 400
    });
});