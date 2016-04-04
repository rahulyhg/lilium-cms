var formBuilder = undefined;
var fileLogic = undefined;
var entites = undefined;
var transaction = undefined;
var log = undefined;
var config = undefined;
var db = undefined;

var AdminAdvertiser = function () {
    this.handlePOST = function ( cli ) {
        cli.touch( 'advertiser.admin.handlePOST' );
        switch ( cli.routeinfo.path[ 2 ] ) {
            case undefined:
                return createAdvertiser( cli );
                break;
            case 'edit':
                return editAdvertiser( cli );
                break;
            case 'delete':
                return deleteAdvertiser( cli );
                break;
            default:
                return cli.throwHTTP( 404, 'Not Found' );
                break;

        }
    };

    this.handleGET = function ( cli ) {

        cli.touch( 'advertiser.admin.handleGET' );

        switch ( cli.routeinfo.path[ 2 ] ) {
            case undefined:
                cli.routeinfo.relsitepath = "/advertiser";
                fileLogic.serveAdminLML(cli, false, new Object(), "plugins/advertiser/dynamic/adverttemplate.lml", "plugins/advertiser/dynamic");
                break;
            case 'edit':
                fileLogic.serveAdminLML(cli, true, new Object(), "plugins/advertiser/dynamic/adverttemplate.lml", "plugins/advertiser/dynamic");
                break;
            default:
                return cli.throwHTTP( 404, 'Not Found' );
                break;

        };
    };

    this.newAdvertiser = function ( cli ) {

    };

    var createAdvertiser = function ( cli ) {
        cli.touch( 'advertiser.createAdvertiser' );
        var form = formBuilder.handleRequest( cli );
        var response = formBuilder.validate( form, true );

        if ( response.success ) {
            var entData = cli.postdata.data;
            var newEnt = entites.initialiseBaseEntity( entData );

            if ( entData.stripeToken ) {
                // Create a new stripe user
                newEnt.stripeToken = entData.stripeToken;

                // Create a stripe customer
                transaction.createNewCustomer( newEnt, function ( stripeid ) {
                    // We don't need the token anymore
                    newEnt.stripeToken = undefined;
                    delete newEnt.stripeToken;

                    newEnt.stripeid = stripeid;

                    entites.registerEntity( cli, newEnt, function () {
                        cli.touch( 'advertiser.registerEntity.callback' );
                        cli.redirect( config.default().server.url + cli.routeinfo.relsitepath );
                    } );
                } );
            } else {
                entites.registerEntity( cli, newEnt, function () {
                    cli.touch( 'advertiser.registerEntity.callback' );
                    cli.redirect( config.default().server.url + cli.routeinfo.relsitepath );
                } );
            }
        } else {
            cli.sendJSON( {
                form: response
            } );
        }
    };

    var editAdvertiser = function ( cli ) {
        var that = this;
        cli.touch( 'advertiser.editAdvertiser' );

        if ( cli.routeinfo.path[ 3 ] ) {

            var id = db.mongoID( cli.routeinfo.path[ 3 ] );
            if ( cli.method == 'POST' ) {

                var form = formBuilder.handleRequest( cli );
                var response = formBuilder.validate( form, true );

                if ( response.success ) {
                    var entData = cli.postdata.data;
                    var serializedForm = formBuilder.serializeForm( form );
                    serializedForm.stripeToken = entData.stripeToken;

                    if ( entData.stripeToken ) {
                        that.addAdvertiserStripeCostumer( serializedForm.stripeToken, serializedForm, id, cli, function () {} )

                    } else {
                        updateAdvertiser( serializedForm, id, cli, function () {
                            fileLogic.serveAdminLML(cli, true, new Object(), "plugins/advertiser/dynamic/adverttemplate.lml", "plugins/advertiser/dynamic");
                        } );
                    }

                } else {
                    cli.sendJSON( {
                        form: response
                    } );
                }

            } else {
                cli.routeinfo.relsitepath = "/advertiser";
                fileLogic.serveAdminLML(cli, false, new Object(), "plugins/advertiser/dynamic/adverttemplate.lml", "plugins/advertiser/dynamic");
            }

        } else {
            cli.throwHTTP( 404, 'Advertiser Not Found' );
        }

    };

    this.addAdvertiserStripeCostumer = function ( stripeToken, serializedPaymentForm, entity_id, cli, cb ) {
        if ( stripeToken ) {
            //Check if there is already a stripe client for this advertiser
            db.findToArray( cli._c, 'entities', {
                _id: db.mongoID( entity_id )
            }, function ( err, arr ) {
                if ( typeof arr[ 0 ] !== 'undefined' && typeof arr[ 0 ].stripeid !== 'undefined' ) {
                    // Update stripe user
                    transaction.updateCustomer( arr[ 0 ].stripeid, serializedPaymentForm, function ( stripeid ) {
                        serializedPaymentForm.stripeid = stripeid;
                        updateAdvertiser( serializedPaymentForm, entity_id, cli, cb );
                    } );
                } else {
                    // Create stripe user
                    arr[ 0 ].stripeToken = stripeToken;
                    transaction.createNewCustomer( arr[ 0 ], function ( stripeid ) {
                        serializedPaymentForm.stripeid = stripeid;
                        updateAdvertiser( serializedPaymentForm, entity_id, cli, cb );
                    } );
                }
            } );
        } else {
            cb( false );
        }
    }

    var updateAdvertiser = function ( form, id, cli, cb ) {
        if ( typeof form.stripeToken !== 'undefined' ) {
            //Remove unneeded data.
            form.stripeToken = undefined;
            delete form.stripeToken;
            form.creaditCard = undefined;
            delete form.creaditCard;
            form.cvc = undefined;
            delete form.cvc;
            form.month = undefined;
            delete form.month;
            form.year = undefined;
            delete form.year;

            db.update( cli._c, 'entities', {
                _id: id
            }, form, function ( err, r ) {
                cb( true, form );
            } );
        } else {
            cb( false );
        }



    }

    var deleteAdvertiser = function ( cli ) {
        cli.touch( 'advertiser.deleteAdvertiser' );
        var id = cli.postdata.data.uid;
        db.findToArray( cli._c, 'entities', {
            _id: db.mongoID( id )
        }, function ( err, arr ) {
            if ( typeof arr[ 0 ].stripeid !== 'undefined' ) {
                transaction.deleteCustomer( arr[ 0 ].stripeid, function () {
                    db.remove( cli._c, 'entities', {
                        _id: db.mongoID( id )
                    }, function ( err, result ) {
                        cli.sendJSON( {} );
                    } );
                } );
            } else {
                db.remove( cli._c, 'entities', {
                    _id: db.mongoID( id )
                }, function ( err, result ) {
                    cli.sendJSON( {} );
                } );
            }

        } );
    };

    var createForm = function () {

        formBuilder.createForm( 'advertiser_create', {
                id: 'stripe_form'
            } )
            .addTemplate( 'entity_create' )
            .addTemplate( 'payment' );

        formBuilder.createForm( 'advertiser_edit', {
                id: 'stripe_form'
            } )
            .addTemplate( 'entity_create' )
            .addTemplate( 'payment' )
            .edit( 'password', '', {}, {
                required: false
            } );
    };

    this.init = function ( abspath ) {
        log = require( abspath + 'log.js' );
        log( "AdvertiserPlugin", "Initializing admin class" );
        formBuilder = require( abspath + 'formBuilder.js' );
        fileLogic = require( abspath + 'filelogic.js' );
        entites = require( abspath + 'entities.js' );
        transaction = require( abspath + 'transaction.js' );
        config = require( abspath + 'config.js' );
        db = require( abspath + 'includes/db.js' );

        log( "AdvertiserPlugin", "Create Form" );
        createForm();
    };

}

module.exports = new AdminAdvertiser();
