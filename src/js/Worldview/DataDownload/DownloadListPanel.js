/*
 * NASA Worldview
 * 
 * This code was originally developed at NASA/Goddard Space Flight Center for
 * the Earth Science Data and Information System (ESDIS) project. 
 *
 * Copyright (C) 2013 United States Government as represented by the 
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
Worldview.namespace("DataDownload");

Worldview.DataDownload.DownloadListPanel = function(config, model) {
    
    var log = Logging.getLogger("Worldview.DataDownload");
    
    var echo = Worldview.DataDownload.ECHO;
   
    var NOTICE = 
        "<div id='DataDownload_Notice'>" +
            "<img class='icon' src='images/info-icon-blue.svg'>" + 
            "<p class='text'>" + 
                "An account with the EOSDIS User Registration System (URS) " + 
                "may be necessary to download data. It is simple and " + 
                "free to sign up! Click to " + 
                "<a href='https://earthdata.nasa.gov/urs/register' target='urs'>" + 
                "register for an account.</a>" +
            "</p>" +
        "</div>";
        
    var panel = null;
    var selection;
    var self = {};
    
    self.show = function() {
        selection = reformatSelection();
        var newPanel = false;
        if ( !panel ) {
            newPanel = true;
            panel = new YAHOO.widget.Panel("DataDownload_DownloadListPanel", {
                width: "600px",
                height: "400px",
                zIndex: 1020,
                visible: false
            });
            panel.setHeader("Download Links");
        }
        panel.setBody(bodyText(selection));
        if ( newPanel ) {
            panel.render(document.body);
            panel.show();
            panel.center();
            panel.hideEvent.subscribe(function() {
                setTimeout(function() { panel.destroy(); panel = null; }, 25);
            });
        
            $("#DataDownload_DownloadListPanel a.wget").click(function() {
                Worldview.DataDownload.WgetPage.show(selection);
            });
        }
    };
    
    self.hide = function() {
        panel.hide();
    };
    
    self.visible = function() {
        return panel !== null;
    };
    
    var reformatSelection = function() {
        var selection = {};
        
        $.each(model.selectedGranules, function(key, granule) {
            if ( !selection[granule.product] ) {
                selection[granule.product] = {
                    name: config.products[granule.product].name,
                    granules: [granule],
                    counts: {}
                };
            } else {
                selection[granule.product].granules.push(granule);
            }
            
            var product = selection[granule.product];
            var id = granule.product;
            
            // For each link that looks like metadata, see if that link is
            // repeated in all granules for that product. If so, we want to 
            // bump that up to product level instead of at the granule level.
            $.each(granule.links, function(index, link) {
                if ( link.rel !== echo.REL_DATA && link.rel !== echo.REL_BROWSE ) {
                    if ( !product.counts[link.href]  ) {
                        product.counts[link.href] = 1;    
                    } else {
                        product.counts[link.href]++;
                    }
                }    
            });    
        });
        
        $.each(selection, function(key, product) {
            product.links = [];
            product.list = [];
            
            // Check the first granule, and populate product level links
            // where the count equals the number of granules
            var granule = product.granules[0];
            $.each(granule.links, function(index, link) {
                var count = product.counts[link.href];
                if ( count === product.granules.length ) {
                    product.links.push(reformatLink(link));
                }
            });
            
            $.each(product.granules, function(index, granule) {
                var item = {
                    label: granule.downloadLabel || granule.label,
                    links: []
                };
                $.each(granule.links, function(index, link) {
                    // Skip this link if now at the product level
                    var count = product.counts[link.href];
                    if ( count === product.granules.length ) {
                        return;
                    }
                    // Skip browse images per Kevin's request
                    if ( link.rel === echo.REL_BROWSE ) {
                        return;
                    }
                    item.links.push(reformatLink(link));                           
                });
                product.list.push(item);                    
            });
            product.list.sort(function(a, b) {
                if ( a.label > b.label ) { 
                    return 1;
                }
                if ( a.label < b.label ) {
                    return -1;
                }
                return 0;
            });        
        });
        
        log.debug(selection);
        return selection; 
    };
    
    var reformatLink = function(link) { 
        // For title, take it if found, otherwise, use the basename of the
        // URI
        return {
            href: link.href,
            title: ( link.title ) ? link.title : link.href.split("/").slice(-1)
        };
    };
    
    var linksText = function(links) {
        var elements = [];
        elements.push("<ul>");
        $.each(links, function(index, link) {
            elements.push(
                "<a href='" + link.href + "' target='_blank'>" + 
                link.title + "</a><br/>");
        });
        elements.push("</ul>");
        return elements.join("\n");
    };
    
    var granuleText = function(granule) {
        var elements = [
            "<tr>",
                "<td>" + granule.label + "</td>",
                "<td>" + linksText(granule.links) + "</td>",
            "</tr>"
        ];
        return elements.join("\n");  
    };
    
    var productText = function(product) {
        var elements = [
            "<h3>" + product.name + "</h3>"
        ];
        
        if ( product.links && product.links.length > 0 ) {
            elements.push("<h5>Data Collection Information</h5>");
            elements.push(linksText(product.links));
        }
        
        elements.push("<h5>Selected Data</h5>");
        elements.push("<table>");

        $.each(product.list, function(index, item) {
            elements.push(granuleText(item));
        });
        elements.push("</table>");
        return elements.join("\n");
    };
    
    var bodyText = function() {
        var elements = [
            NOTICE,
            "<div class='wget'>", 
                "<a class='wget' href='#'>Bulk Download (wget)</a>", 
            "</div>"
        ];
        $.each(selection, function(key, product) {
            elements.push(productText(product));  
        });
        var text = elements.join("\n<br/>\n") + "<br/>";
        return text;
    };
            
    return self;

};
        