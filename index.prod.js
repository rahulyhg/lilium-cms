/*********************************************************************************************************
 *                                                                                                       *
 *  88          88 88 88                                     ,ad8888ba,  88b           d88  ad88888ba    *
 *  88          "" 88 ""                                    d8"'    `"8b 888b         d888 d8"     "8b   *
 *  88             88                                      d8'           88`8b       d8'88 Y8,           *
 *  88          88 88 88 88       88 88,dPYba,,adPYba,     88            88 `8b     d8' 88 `Y8aaaaa,     *
 *  88          88 88 88 88       88 88P'   "88"    "8a    88            88  `8b   d8'  88   `"""""8b,   *
 *  88          88 88 88 88       88 88      88      88    Y8,           88   `8b d8'   88         `8b   *
 *  88          88 88 88 "8a,   ,a88 88      88      88     Y8a.    .a8P 88    `888'    88 Y8a     a8P   *
 *  88888888888 88 88 88  `"YbbdP'Y8 88      88      88      `"Y8888Y"'  88     `8'     88  "Y88888P"    *
 *                                                                                                       *
 *********************************************************************************************************
 * LILIUM CMS | Entry Point                                                                              *
 *                                                                                                       *
 * Lilium is a lightning-fast, online Content Management System built with node.js, without express.     *
 * Its power resides in the cache engine running behind Lilium, which reduces CPU usage, RAM and         *
 * database access.                                                                                      *
 *                                                                                                       *
 * Interpreting its own simple language, Lilium uses LML (Lilium Markup Language) to create the          *
 * templates and generate the served files. LML is user friendly, ressemble HTML and makes it easy for   *
 * new developers or web designers to customize their very own themes                                    *
 *                                                                                                       *
 *----- Dependencies ----------------------------------------------------------------------------------- *
 *                                                                                                       *
 * Lilium needs bower installed, a Mongo database, and Node JS. That's it!                               *
 * The user running node must have write access to the root directory of Lilium.                         *
 * We recommend the node package "pm2" for running Lilium.                                               *
 *                                                                                                       *
 *----- The people behind Lilium ----------------------------------------------------------------------- *
 *                                                                                                       *
 *    Author : Erik Desjardins                                                                           *
 *    Contributors : Samuel Rondeau-Millaire                                                             *
 *    Documentation : http://liliumcms.com/docs                                                          *
 *                                                                                                       *
 *********************************************************************************************************/

global.__STARTUPSTAMP = Date.now();
require('./gardener.js');
