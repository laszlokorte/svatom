# TODOS

* canvas
	* extract multi touch handlings from tools into helper functions
	* clean up and extract all vector math operations
	* clean up common lenses into utility library
	* smooth pen tool (catmulrom)

	* element selection (hit-areas tool, click selection, lasso selection, rubberband selection, boolean modifiers)
	* cull elements outside camera frame

	* Graph Edge tool 
		* create way points, move waypoints, delete way points
		* different routing styles

	* properties editor
		* edit existing properties
		* tool parameters

	* refactor local tool states into FSMs
	
	* layers and groups
		* implement draw order via svg use:href
		* implement grouping
			* try to implement groups as a combination of a node with special kind of ownership edge to other objects
			* try to use the same concept to construct child/parent relationships between other
