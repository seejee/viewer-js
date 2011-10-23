var Omnyx = Omnyx || {};

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