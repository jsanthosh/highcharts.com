/**
 * Set the default options for area
 */
defaultPlotOptions.area = merge(defaultSeriesOptions, {
	threshold: 0
	// trackByArea: false,
	// lineColor: null, // overrides color, but lets fillColor be unaltered
	// fillOpacity: 0.75,
	// fillColor: null
});

/**
 * AreaSeries object
 */
var AreaSeries = extendClass(Series, {
	type: 'area',
	
	/**
	 * For stacks, don't split segments on null values. Instead, draw null values with 
	 * no marker. Also insert dummy points for any X position that exists in other series
	 * in the stack.
	 */ 
	getSegments: function () {
		var segments = [],
			stack = this.yAxis.stacks.area,
			pointMap = {},
			plotY,
			points = this.points,
			i,
			x;

		if (this.options.stacking) {
			// Create a map where we can quickly look up the points by their X value.
			for (i = 0; i < points.length; i++) {
				pointMap[points[i].x] = points[i];
			}

			for (x in stack) {
				// The point exists, push it to the segment
				if (pointMap[x]) {
					segments.push(pointMap[x]);

				// There is no point for this X value in this series, so we 
				// insert a dummy point in order for the areas to be drawn
				// correctly.
				} else {
					plotY = this.yAxis.translate(stack[x].cum, 0, 1, 0, 1);
					segments.push({ 
						y: null, 
						plotX: this.xAxis.translate(x), 
						plotY: plotY, 
						yBottom: plotY,
						onMouseOver: noop
					});
				}
			}
			segments = [segments];

		} else {
			segments = Series.prototype.getSegments.call(this);	
		}
		this.segments = segments;
		
	},
	
	/**
	 * Extend the base Series getSegmentPath method by adding the path for the area.
	 * This path is pushed to the series.areaPath property.
	 */
	getSegmentPath: function (segment) {
		
		var segmentPath = Series.prototype.getSegmentPath.call(this, segment), // call base method
			areaSegmentPath = [].concat(segmentPath), // work on a copy for the area path
			i,
			options = this.options,
			segLength = segmentPath.length;
		
		if (segLength === 3) { // for animation from 1 to two points
			areaSegmentPath.push(L, segmentPath[1], segmentPath[2]);
		}
		if (options.stacking && !this.closedStacks) {
			
			// Follow stack back. Todo: implement areaspline. A general solution could be to 
			// reverse the entire graphPath of the previous series, though may be hard with
			// splines and with series with different extremes
			for (i = segment.length - 1; i >= 0; i--) {
			
				// step line?
				if (i < segment.length - 1 && options.step) {
					areaSegmentPath.push(segment[i + 1].plotX, segment[i].yBottom);
				}
				
				areaSegmentPath.push(segment[i].plotX, segment[i].yBottom);
			}

		} else { // follow zero line back
			this.closeSegment(areaSegmentPath, segment);
		}
		this.areaPath = this.areaPath.concat(areaSegmentPath);
		
		return segmentPath;
	},
	
	/**
	 * Extendable method to close the segment path of an area. This is overridden in polar 
	 * charts.
	 */
	closeSegment: function (path, segment) {
		var translatedThreshold = this.yAxis.getThreshold(this.options.threshold);
		path.push(
			L,
			segment[segment.length - 1].plotX,
			translatedThreshold,
			L,
			segment[0].plotX,
			translatedThreshold
		);
	},
	
	/**
	 * Draw the graph and the underlying area. This method calls the Series base
	 * function and adds the area. The areaPath is calculated in the getSegmentPath
	 * method called from Series.prototype.drawGraph.
	 */
	drawGraph: function () {
		
		// Define or reset areaPath
		this.areaPath = [];
		
		// Call the base method
		Series.prototype.drawGraph.apply(this);
		
		// Define local variables
		var areaPath = this.areaPath,
			options = this.options,
			area = this.area;
		
		// Create or update the area
		if (area) { // update
			area.animate({ d: areaPath });

		} else { // create
			this.area = this.chart.renderer.path(areaPath)
				.attr({
					fill: pick(
						options.fillColor,
						Color(this.color).setOpacity(options.fillOpacity || 0.75).get()
					),
					zIndex: 0 // #1069
				}).add(this.group);
		}
	},
	
	/**
	 * Get the series' symbol in the legend
	 * 
	 * @param {Object} legend The legend object
	 * @param {Object} item The series (this) or point
	 */
	drawLegendSymbol: function (legend, item) {
		
		item.legendSymbol = this.chart.renderer.rect(
			0,
			legend.baseline - 11,
			legend.options.symbolWidth,
			12,
			2
		).attr({
			zIndex: 3
		}).add(item.legendGroup);		
		
	}
});

seriesTypes.area = AreaSeries;