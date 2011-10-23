var Omnyx = Omnyx || {};

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