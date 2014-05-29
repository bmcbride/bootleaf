if (typeof leafletActiveAreaPreviousMethods === 'undefined') {
    // Defining previously that object allows you to use that plugin even if you have overridden L.map
    leafletActiveAreaPreviousMethods = {
        getCenter: L.Map.prototype.getCenter,
        setView: L.Map.prototype.setView,
        setZoomAround: L.Map.prototype.setZoomAround,
        getBoundsZoom: L.Map.prototype.getBoundsZoom
    };
}


L.Map.include({
    getViewport: function() {
        return this._viewport;
    },

    getViewportBounds: function() {
        var vp = this._viewport,
            topleft = L.point(vp.offsetLeft, vp.offsetTop),
            vpsize = L.point(vp.clientWidth, vp.clientHeight);

        if (vpsize.x === 0 || vpsize.y === 0) {
            if (window.console) {
                console.error('The viewport has no size. Check your CSS.');
            }
        }

        return L.bounds(topleft, topleft.add(vpsize));
    },

    getViewportLatLngBounds: function() {
        var bounds = this.getViewportBounds();
        return L.latLngBounds(this.containerPointToLatLng(bounds.min), this.containerPointToLatLng(bounds.max));
    },

    getOffset: function() {
        var mCenter = this.getSize().divideBy(2),
            vCenter = this.getViewportBounds().getCenter();

        return mCenter.subtract(vCenter);
    },

    getCenter: function () {
        var center = leafletActiveAreaPreviousMethods.getCenter.call(this);

        if (this.getViewport()) {
            var zoom = this.getZoom(),
                point = this.project(center, zoom);
            point = point.subtract(this.getOffset());

            center = this.unproject(point, zoom);
        }

        return center;
    },

    setView: function (center, zoom, options) {
        center = L.latLng(center);

        if (this.getViewport()) {
            var point = this.project(center, zoom);
            point = point.add(this.getOffset());
            center = this.unproject(point, zoom);
        }

        return leafletActiveAreaPreviousMethods.setView.call(this, center, zoom, options);
    },

    setZoomAround: function (latlng, zoom, options) {
        var vp = this.getViewport();

        if (vp) {
            var scale = this.getZoomScale(zoom),
                viewHalf = this.getViewportBounds().getCenter(),
                containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

                centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
                newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

            return this.setView(newCenter, zoom, {zoom: options});
        } else {
            return leafletActiveAreaPreviousMethods.setZoomAround.call(this, point, zoom, options);
        }
    },

    getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
        bounds = L.latLngBounds(bounds);

        var zoom = this.getMinZoom() - (inside ? 1 : 0),
            maxZoom = this.getMaxZoom(),
            vp = this.getViewport(),
            size = (vp) ? L.point(vp.clientWidth, vp.clientHeight) : this.getSize(),

            nw = bounds.getNorthWest(),
            se = bounds.getSouthEast(),

            zoomNotFound = true,
            boundsSize;

        padding = L.point(padding || [0, 0]);

        do {
            zoom++;
            boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
            zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

        } while (zoomNotFound && zoom <= maxZoom);

        if (zoomNotFound && inside) {
            return null;
        }

        return inside ? zoom : zoom - 1;
    }

});

L.Map.include({
    setActiveArea: function (css) {
        var container = this.getContainer();
        this._viewport = L.DomUtil.create('div', '');
        container.insertBefore(this._viewport, container.firstChild);

        if (typeof css === 'string') {
            this._viewport.className = css;
        } else {
            L.extend(this._viewport.style, css);
        }
        return this;
    }
});