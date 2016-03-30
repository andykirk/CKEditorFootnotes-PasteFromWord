/**
 * Plugin to convert pasted Word footnotes in CKEditor Footnotes format.
 *
 * 
 */

// Register the plugin within the editor.
CKEDITOR.plugins.add( 'footnotesfromword', {
    requires: 'footnotes,pastefromword',
    
    init: function(editor) {
        editor.on( 'paste', function( evt ) {
            //console.log(evt.editor);
            var data = evt.data;
            
            // Check if there are any Word footnotes:
            if (!(/<a href="#_ftn/).test(data.dataValue)) {
                return;
            }
            // Cancel the paste event:
            evt.cancel();
            editor.fire('lockSnapshot');
            var $existing_data = jQuery('<div/>').html(editor.getData());
            var contents = jQuery('<div/>').html(data.dataValue); //jQuery('<div>' + data.dataValue + '</div>');
            var footnotes = '';
            contents.find('a[name]').each(function(){
                $this = jQuery(this);
                
                // Remove unnecessary named anchors e.g. OLE_LINK1:
                if ($this.attr('name').match(/^OLE_LINK/)) {
                    $this.replaceWith($this.html());
                }
                
                // Start to build the footnote:
                if ($this.attr('name').match(/^_ftnref/)) {
                    // Get the incoming footnote text ready of existance check:
                    var $footnote_p = jQuery(contents.find('a[href="#' + $this.attr('name') + '"]').parent());
                    var footnote_text = $footnote_p.html().replace(/^<a[^>]+>[^<]+<\/a>/, '');
                    
                    // Add the text of any sibling p tags up to the start of the next ref:
                    $footnote_p.nextUntil('p > a[name]').each(function(){
                        footnote_text += jQuery(this).html();
                        jQuery(this).remove();
                    });
                    $footnote_p.remove();
                    
                    footnote_text = jQuery.trim(footnote_text.replace(/&nbsp;/g, ' ').replace(/(\n|\r)/g, ' ').replace(/\s{2,}/g, ' '));
                
                    // Check for pre-existence footnote:
                    var footnote_id = false
                    $existing_data.find('cite').each(function(){
                        var $this = jQuery(this);
                        if ($this.text() == footnote_text) {
                            footnote_id = $this.parent().attr('data-footnote-id');
                            return false;
                        }
                    });
                    
                    if (!footnote_id) {
                        footnote_id = editor.plugins.footnotes.generateFootnoteId();
                        footnotes += '<li data-footnote-id="' + footnote_id + '"><cite>' + footnote_text + '</cite></li>';
                    }
                    
                    var footnote_marker = '<sup data-footnote-id="' + footnote_id + '">X</sup>';
                    $this.replaceWith(footnote_marker);
                }
            });
            var new_data = contents.html();    
            editor.insertHtml(new_data);
            data = editor.getData();
            
            // Tidy up some things:
            data = data.replace(/<p>&nbsp;<\/p>\n*<hr \/>/, '');
            
            // Add footnotes section if it doesn't exist:
            if ((/<section.*class="footnotes"/).test(data)) {
                data = data.replace(/(<section.*class="footnotes"[^]*)<\/ol>[^]*?<\/section>/, '$1' + footnotes + '</ol></section>');
            } else {
                var header_title = editor.config.footnotesTitle ? editor.config.footnotesTitle : 'Footnotes';
                var header_els = ['<h2>', '</h2>'];//editor.config.editor.config.footnotesHeaderEls
                if (editor.config.footnotesHeaderEls) {
                    header_els = editor.config.footnotesHeaderEls;
                }
                data += '<section class="footnotes"><header>' + header_els[0] + header_title + header_els[1] + '<ol>' + footnotes + '</ol></section>';
            }
            editor.setData(data);
            editor.fire('unlockSnapshot');

            setTimeout(function(){
                    editor.fire('change');
                },
                500
            );
        });
    }
});