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

            var data = evt.data;

            // Check if there are any Word footnotes:
            if (!(/<a[^>]*href="#_ftn/).test(data.dataValue)) {
                return;
            }

            // Cancel the paste event:
            evt.cancel();
            editor.fire('lockSnapshot');

            var existing_data = CKEDITOR.dom.element.createFromHtml('<div>');
            existing_data.setHtml(editor.getData());

            var contents = CKEDITOR.dom.element.createFromHtml('<div>');
            contents.setHtml(data.dataValue);

            var footnotes = '';
            contents.find('a[name]').toArray().forEach(function(item){

                // Remove unnecessary named anchors e.g. OLE_LINK1:
                if (item.getAttribute('name').match(/^OLE_LINK/)) {
                    console.log(item);
                    item.remove();
                }

                // Start to build the footnote:
                if (item.getAttribute('name').match(/^_ftnref/)) {
                    // Get the incoming footnote text ready for existance check:
                    var footnote_p = contents.findOne('a[href="#' + item.getAttribute('name') + '"]').getParent();
                    var footnote_text = footnote_p.getHtml().replace(/^<a[^>]+>[^<]+<\/a>/, '');

                    // Add the text of any sibling p tags up to the start of the next ref:
                    var t = footnote_p;
                    while (t.hasNext()) {
                        t = t.getNext();

                        if (t.findOne('> a[name]')) {
                            break;
                        } else {
                            footnote_text += t.getHtml();
                        }
                    }
                    footnote_p.remove();

                    footnote_text = CKEDITOR.tools.trim(footnote_text.replace(/&nbsp;/g, ' ').replace(/(\n|\r)/g, ' ').replace(/\s{2,}/g, ' '));

                    // Remove any Word [n] anchors from the footnotes:
                    footnote_text = footnote_text.replace(/<a[^>]*href="#_ftnref[^>]+>.*?<\/a>/g, '');

                    // Check for pre-existence footnote:
                    var footnote_id = false;
                    existing_data.find('cite').toArray().forEach(function(item){
                        if (item.getText() == footnote_text) {
                            footnote_id = item.getParent().attr('data-footnote-id');
                            return false;
                        }
                    });

                    if (!footnote_id) {
                        footnote_id = editor.plugins.footnotes.generateFootnoteId();
                        footnotes += '<li data-footnote-id="' + footnote_id + '"><cite>' + footnote_text + '</cite></li>';
                    }

                    var footnote_marker = CKEDITOR.dom.element.createFromHtml('<sup data-footnote-id="' + footnote_id + '">X</sup>');
                    footnote_marker.replace(item);
                }
            });
            var new_data = contents.getHtml();
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