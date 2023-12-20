# UltimateDarkTower - BETA

Working on these docs... so consider this placeholder for the moment.

The Ultimate Dark Tower library is a javascript library that you can use in your projects to control the Tower that comes with Restoration Game's Return To Dark Tower board game.

### Web Application Examples

I've created two samples to show the library in action that you can use from your browser. Just power on your Tower and go to the links below!

The first is a Tower Controller that replicates the functionality found in the official Return To Dark Tower app (under settings). In addition I created a game called 'The Towers Challenge'. It's a simple game that only requires the Tower, and serves as a good example while allowing me to 'dogfood' the tower library.

These web apps require Web Bluetooth, which is currently only supported in certain browsers, such as Chrome on the desktop, Chrome on Android mobile devices, Microsoft Edge, and Samsung Internet. You can find a list of all supported browsers at [CanIUse](https://caniuse.com/?search=web%20bluetooth).

[Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)

[Tower Game](https://chessmess.github.io/UltimateDarkTower/dist/examples/game/TowerGame.html)

## Known Issues:

Tower Response Handling is not fully implemented.

-   Command Queue - Currently the library sends commands as soon as they are requested. Need to add in a queue system that looks for a tower status response to the previous command before sending the next. Sending to many commands on after the other will cause the tower to disconnect.

-   Utility Functions - Being able to call functions like 'BreakSeal' that handles the lights and sounds for that type of event, Randomize Levels which will can randomize the position of a level, and others such as this.

## Community

Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
