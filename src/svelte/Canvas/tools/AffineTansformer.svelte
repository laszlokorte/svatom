<script>

	const {children} = $props()

</script>


<rect x="30" y="120" width="300" height="200" stroke="RoyalBlue"  fill-opacity="0.1" fill="DodgerBlue " />

<circle cx="180" cy="80" r="5" fill="RoyalBlue" />


<circle cx="30" cy="120" r="5" fill="RoyalBlue" cursor="grab" pointer-events="all" />
<circle cx="330" cy="120" r="5" fill="RoyalBlue" cursor="grab" pointer-events="all" />
<circle cx="30" cy="320" r="5" fill="RoyalBlue" cursor="grab" pointer-events="all" />
<circle cx="330" cy="320" r="5" fill="RoyalBlue" cursor="grab" pointer-events="all" />


<circle cx="180" cy="120" r="3" fill="RoyalBlue" cursor="grab" pointer-events="all" />
<circle cx="30" cy="220" r="3" fill="RoyalBlue" cursor="grab" pointer-events="all" />
<circle cx="180" cy="320" r="3" fill="RoyalBlue" cursor="grab" pointer-events="all" />
<circle cx="330" cy="220" r="3" fill="RoyalBlue" cursor="grab" pointer-events="all" />

<line x1="180" y1="120" x2="180" y2="80" stroke="RoyalBlue" cursor="grab" pointer-events="all" />


{@render children()}