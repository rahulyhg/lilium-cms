# Contributing 

Before you start reading this, Narcity Media wants you to know that : 
 - You are awesome. 🙌
 - We're grateful that you are taking of your time to read this. 😽
 - We're all ears. 👂
 
Lilium CMS is supposed to save both you and your readers' time. 
It is also supposed to be light, almost dependency free, and fun to use.
If you found something that makes any of the previous statement false, we're there to help. 

## Something is not working

We use GitHub's issue templates to make bug reporting easier. 
Simply navigate to the [issue section](https://github.com/narcitymedia/lilium-cms/issues) of this repo, and open a new one.

You will find three types of issue available : 

** Feature request **
Use this option if you think of something that would make this project better, but cannot / don't want to contribute code. 
This is a great way to open up a conversation and get other people involved, too. 

** Something is not working **
Oopsies. 💥 Well, that's ok. Nothing is flawless. The issue template will provide multiple "fields" which must be filled in order
for the issue to be considered valid. Make sure to check the list of issues before opening one. Chances are someone else has
already opened a similar one. 

** I am working on something and need an issue open **
Really? You must be the coolest person to invite to a party. 
Now, simply describe what problem you are fixing (reference to an other issue can help), or what feature you are implementing.
The first contributors will get their name in the list of contributors in the README, because you rock. 🎸

Next step : open a pull request, and get your green squares / [street cred](https://www.urbandictionary.com/define.php?term=street%20cred). 

## What's up with all the emojis
I don't know, man. Millennials use those. Carry on. 

## Pull requests
Once you're done working on something you want merged in this repo, we like to use GitHub's [Pull Request](https://github.com/narcitymedia/lilium-cms/pulls) system. 
There is no template (yet) since we're not sure how the community will use those. For now, please document as much as possible
the feature you've been working on, or the bug you fixed. Please reference an issue using the # notation. 

## Branches
We're using three main branches plus features branches. 

MASTER < DEV < V4 < FEATURES

All feature branches (including the ones from the community) are merged in the current version (v4). 
Once everything is stable, we're merging v4 into dev for everyone to be able to test. 

If the dev branch is stable enough, we're merging dev into master. We'll probably start using the tags soon.

** Case scenario **
Maria finds an issue in the CMS she can fix. Maria opens an issue of type _I am working on something and need an issue open_.
Maria forks the repo, and creates a branch called "fix-some-bug". Maria fixes the bug because she's an awesome rockstar. 
Maria opens a pull request, and wants to merge her "fix-some-bug" branch with our "v4" branch. 
Maria's pull request passes CI, is reviewed by our team, and is merged in v4. 
V4 will at some point be merged in dev, then master. Maria's fix is live. 

## Setting up a work environment
Simply close the repo, and follow the README. It's pretty simple, really. 
We currently only actively support Linux, but it will work on Mac. If you are interested in helping us support other platforms, 
feel free to open an issue and propose a solution. The more platform we support, the more love we can spread. 

## Let's keep this dependency free
If you find an awesome library on [npm](https://www.npmjs.com/) you want us to use, please keep in mind we're really picky 
with dependencies. We don't use [express](https://expressjs.com/), [mongoose](https://mongoosejs.com/), or other commonly used library for performance and scalability.
Don't get us wrong! We LOVE those libraries. It's simply not a good fit for this project. 

If your pull request adds a new dependency to the project, make sure to document how is benefits the project, why a
library was used instead of your own code, and why this one amongst all the other libraries. 

Node.JS libraries (backend) are usually fine and won't add that much stress on the CPU, and won't load the RAM with _stuff_. 

## 
