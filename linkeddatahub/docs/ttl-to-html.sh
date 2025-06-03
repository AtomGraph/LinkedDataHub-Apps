#!/bin/sh
# absolute path to output folder
OUTPUT_FOLDER="$PWD"/html
# find all the turtle files and use Jena riot to convert them to TriX format, merging them into a single trix file
# (sed is used to trim the <trix> root element from the individual files) 

# The individual Turtle files are in actual fact not distinct graphs with their own base URI; they are all fragments of a single graph,
# as is evidenced by the way that some of them have a #has_parent relationships referring to that same graph as <>, so for this 
# conversion, we maintain the correct references by explicitly assigning all the graphs relative URIs based on their filepath.
# The script uses sed to trim the first and last lines from each TriX file (the start and end tags for the root trix element), 
# so as to be able to concatenate the trix data into a single file. 
echo '<trix xmlns="http://www.w3.org/2004/03/trix/trix-1/">' > docs.trix
# construct base URI from filepath and append the TriX data to the docs.trix file
find . -name "*.ttl" -exec sh -c 'riot --output=trix --base="file:///$(echo "$1" | sed "s|^\./||; s|\.ttl$|/|")" "$1" | sed "1d;\$d" >> docs.trix' sh {} \;
echo '</trix>' >> docs.trix

./sha1map-to-xml.sh files > files.xml

mkdir -p "$OUTPUT_FOLDER"

# recursively copy the files folder to the output folder
cp -r files "$OUTPUT_FOLDER"

# convert the TriX data file to a set of XHTML pages
docker run --rm -v "$PWD":"/docs" -v "$OUTPUT_FOLDER":"/output" atomgraph/saxon -s:/docs/docs.trix -xsl:/docs/trix-to-html.xsl output-folder="/output"
# delete the temporary trix file
#rm docs.trix