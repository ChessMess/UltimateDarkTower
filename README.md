# UltimateDarkTower - BETA

Working on these docs... so consider this placeholder for the moment.

The Ultimate Dark Tower library is a javascript library that you can use in your projects to control the Tower that comes with Restoration Game's Return To Dark Tower board game.

I've created a couple of sample pages that show the library in use, linked below.

## Known Issues:

Currently we are not handling the communication coming back from the tower. It's received but just streamed to the console, it will be the next piece I work on. This means the following are not handled:

- Skull drop detection - The tower sends it's current drop count when a skull drop is detected.
- Command completion - The tower acks a command and then sends a command complete message.

Other items on the TODO list:

- Command Queueing & Retry - Right now if the command is sent and the tower throws an error that an operation is in process that command is lost. Queing and Retry needs to be implemented, and will be dependant upon handling the tower response. I have a makeshift retry system in place but it needs work and is only temporary until I fully implement tower response handling.
- Utility Functions - Being able to call functions like 'BreakSeal' that handles the lights and sounds for that type of event, Randomize Levels which will can randomize the position of a level, and others such as this.

### Web Application Examples

I've created two samples to show the library in action. The first is a Tower Controller that replicates the functionality found in the official Return To Dark Tower app (under settings). In addition I created a game called 'The Towers Challenge'. It's a simple game that only requires the Tower, and serves as a good example while allowing me to 'dogfood' the tower library.

These web apps require Web Bluetooth, which is currently only supported in certain browsers, such as Chrome on the desktop, Chrome on Android mobile devices, Microsoft Edge, and Samsung Internet. You can find a list of all supported browsers at [CanIUse](https://caniuse.com/?search=web%20bluetooth).

You will need your Dark Tower from the game to use these apps.

[Tower Controller](https://chessmess.github.io/UltimateDarkTower/examples/controller/TowerController.html)

[Tower Game](https://chessmess.github.io/UltimateDarkTower/examples/game/TowerGame.html)

## Community

Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
