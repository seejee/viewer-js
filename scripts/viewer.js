var Omnyx = {}

Omnyx.Net = function() {

    return {
        downloadBinaryData: function(url, arrayHandler) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
			      request.responseType = 'arraybuffer';
            request.onload = function(e) {
                arrayHandler(new Uint8Array(this.response));
            };
            request.send();
        }
    };
} ();

Omnyx.Decoding = function() {

    return {

        BayerToRgbaConverter: function BayerToRgbaConverter() {

            this.convert = function(bayer, pixelWidth, pixelHeight) {
                var rgbBuffer = new ArrayBuffer(pixelHeight * pixelWidth * 3);
                var rgb = new Uint8Array(rgbBuffer);
                
                return this.convertInto(bayer, rgb, pixelWidth, pixelHeight);
            };
            
            this.convertInto = function(bayer, rgb, pixelWidth, pixelHeight) {
                
                var bayerStep = pixelWidth;
                var rgbStep = pixelWidth * 4;

                var startWithGreen = true;
                var blueIndex = 1;
                var rgbPos = rgbStep + 4 + 1;
                // move to green byte in second pixel on second line
                var bayerPos = 0;
                var width = pixelWidth - 2;

                var t0;
                var t1;
                var t2;
                var t3;

                for (height = pixelHeight - 4; height > 0; height--)
                {
                    var bayerEndOfRowPos = bayerPos + width;

                    if (startWithGreen)
                    {
                        t0 = this.average_2(bayer[bayerPos + 1], bayer[bayerPos + ((bayerStep * 2) + 1)]);
                        t1 = this.average_2(bayer[bayerPos + bayerStep], bayer[bayerPos + bayerStep + 2]);

                        rgb[rgbPos - 1] = t0;
                        rgb[rgbPos] = bayer[bayerPos + bayerStep + 1];
                        rgb[rgbPos + 1] = t1;
                        rgb[rgbPos + 2] = 255;
                        bayerPos++;
                        rgbPos += 4;
                    }

                    while (bayerPos <= bayerEndOfRowPos - 2)
                    {
                        t0 = this.average_4(bayer[bayerPos], bayer[bayerPos + 2], bayer[bayerPos + (bayerStep * 2)], bayer[bayerPos + ((bayerStep * 2) + 2)]);
                        t1 = this.average_4(bayer[bayerPos + 1], bayer[bayerPos + bayerStep], bayer[bayerPos + bayerStep + 2], bayer[bayerPos + ((bayerStep * 2) + 1)]);

                        t2 = this.average_2(bayer[bayerPos + 2], bayer[bayerPos + ((bayerStep * 2) + 2)]);
                        t3 = this.average_2(bayer[bayerPos + bayerStep + 1], bayer[bayerPos + bayerStep + 3]);

                        if (blueIndex > 0)
                        {
                            rgb[rgbPos - 1] = t0;
                            rgb[rgbPos] = t1;
                            rgb[rgbPos + 1] = bayer[bayerPos + bayerStep + 1];
                            rgb[rgbPos + 2] = 255;
                            
                            rgb[rgbPos + 3] = t2;
                            rgb[rgbPos + 4] = bayer[bayerPos + bayerStep + 2];
                            rgb[rgbPos + 5] = t3;
                            rgb[rgbPos + 6] = 255;
                        }
                        else
                        {
                            rgb[rgbPos + 1] = t0;
                            rgb[rgbPos] = t1;
                            rgb[rgbPos - 1] = bayer[bayerPos + bayerStep + 1];
                            rgb[rgbPos + 2] = 255;
                            
                            rgb[rgbPos + 5] = t2;
                            rgb[rgbPos + 4] = bayer[bayerPos + bayerStep + 2];
                            rgb[rgbPos + 3] = t3;
                            rgb[rgbPos + 6] = 255;
                        }

                        bayerPos += 2;
                        rgbPos += 8;
                    }

                    if (bayerPos < bayerEndOfRowPos)
                    {
                        t0 = this.average_4(bayer[bayerPos], bayer[bayerPos + 2], bayer[bayerPos + (bayerStep * 2)], bayer[bayerPos + ((bayerStep * 2) + 2)]);
                        t1 = this.average_4(bayer[bayerPos + 1], bayer[bayerPos + bayerStep], bayer[bayerPos + bayerStep + 2], bayer[bayerPos + ((bayerStep * 2) + 1)]);

                        rgb[rgbPos - blueIndex] = t0;
                        rgb[rgbPos] = t1;
                        rgb[rgbPos + blueIndex] = bayer[bayerPos + bayerStep + 1];
                        rgb[rgbPos + blueIndex + 1] = 255;
                        bayerPos++;
                        rgbPos += 4;
                    }

                    bayerPos -= width;
                    rgbPos -= width * 4;

                    blueIndex = -blueIndex;
                    startWithGreen = !startWithGreen;

                    rgbPos += rgbStep;
                    bayerPos += bayerStep;
                }

                return rgb;
            };
            
            this.average_2 = function(first, second)
            {
                return ((first + second + 1) / 2);
            };

            this.average_4 = function(first, second, third, fourth)
            {
                return ((first + second + third + fourth + 2) / 4);
            };
        }
    };
} ();

Omnyx.Viewer = function() {

    return {

        ImageTile: function ImageTile(image, position)
        {
            this.image = image;
            this.position = position;
            this.draw = function(ctx) {
                ctx.drawImage(this.image, this.position.x, this.position.y);
            };
        },

        ImageDataTile: function ImageDataTile(imageData, position)
        {
            this.imageData = imageData;
            this.position = position;
            this.draw = function(ctx) {
                ctx.putImageData(this.imageData, this.position.x, this.position.y);
            };
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
                this.tiles.push(new Omnyx.Viewer.ImageTile(image, position));
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
                ctx.clearRect( -canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2);

                for (idx in tiles) {
                    var tile = tiles[idx];
                    tile.draw(ctx);
                }

                ctx.restore();
            };
            
            this.addRgb = function(width, height, callback) {
                var ctx = this.ctx;

                var imageData = ctx.createImageData(width, height);
                console.log("got canvas");
                var d = imageData.data;
                callback(d);
                
                this.tiles.push(new Omnyx.Viewer.ImageDataTile(imageData, {
                    x: 0,
                    y: 0
                }));
                console.log("created image data object");
                this.draw();
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

    var viewer = new Omnyx.Viewer.Viewer(canvas[0]);
    Omnyx.Viewer.bindViewerToMouse(canvas, viewer);
    Omnyx.Viewer.bindViewerToKeyboard($(document), viewer);

    Omnyx.Net.downloadBinaryData('content/tile.raw', function(bytes) {
      console.log("downloaded data");

      viewer.addRgb(3296, 2472, function(imageData) {
        var bayerToRgb = new Omnyx.Decoding.BayerToRgbaConverter();
        var rgb = bayerToRgb.convertInto(bytes, imageData, 3296, 2472);
        console.log("converted to rgb");
      });
      console.log("drawn");
    });
});