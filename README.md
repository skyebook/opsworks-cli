# OpsWorks CLI

The Command Line Interface you wish Amazon shipped for [OpsWorks](http://aws.amazon.com/opsworks/).

## Installation

	npm install -g opsworks-cli

## Usage

Before using this tool, it is important to know that unique naming conventions are expected throughout our OpsWorks configuration.
Having stacks with the same name or layers of the same name will confuse this tool as it works on the human-readable labels assigned rather than the UUID's assigned by AWS internally.

### Describe stack layers

This will list the layers in a stack

	opsworks describe [stack]

### List layer instances

This will list the instances in a layer

	opsworks list [stack] [layer]

### Add  some instances

You can use `opsworks-cli` to quickly add instances to a layer.  The basic syntax is:

	opsworks add [stack] [layer]

#### Add instances across all Availability Zone's

The `opsworks add` command provides a flexible way to create new instances.

	opsworks add my_stack my_layer --count 6 --size c3.large --prefix hostname_prefix --distribute --start

This command will create *and start* (via the --start flag) 6 new instances across the layer's Availability Zone's (via the --distribute flag).
Instance hostnames are the concatenation of the `prefix` argument and the number of the created instance.

For example, running the above in **us-east** will result in the following instances being spawned:

	hostname_prefix-0	c3.large	us-east-1a
	hostname_prefix-1	c3.large	us-east-1b
	hostname_prefix-2	c3.large	us-east-1d
	hostname_prefix-3	c3.large	us-east-1a
	hostname_prefix-4	c3.large	us-east-1b
	hostname_prefix-5	c3.large	us-east-1d

### SSH

`opsworks ssh` provides the ability to SSH into one or more instances.  This works by starting a `[tmux](http://en.wikipedia.org/wiki/Tmux)` session, which must be available on your system.

Most Linux distributions have tmux available in their default repositories; there is a [Homebrew](http://brew.sh) formula available for OS X as well:

	Ubuntu/Debian	apt-get install tmux
	OS X			brew install tmux

#### Connect to a single instance

	opsworks ssh my_stack my_layer -h my_instance_hostname

#### Connecting to an entire layer

This will create a multi-pane `tmux` session.

	opsworks ssh my_stack my_layer

#### Configuring private key authentication

`config.json`, located in the install path of this module contains a default SSH key location. You may choose to change this:

	opsworks config ssh.identity ~/.ssh/my_favorite_key

or supply a key manually (this will override the default key specified in `config.json`):

	opsworks ssh my_stack my_layer -i ~/.ssh/my_other_key


### Stopping instances

`opsworks stop` provides a way to stop instances.  Stopped instances are *not* automatically deleted, see `opsworks delete` if you seek that functionality.
There are two methods of stopping instances.  You can stop all instances in a layer, or instances target by a prefix filter.

#### Stopping all instances in a layer

	opsworks stop my_stack my_layer --all

#### Stopping instances matching a prefix

In the case where you may be looking to shut down all instances running some old software, being able to target them by a git ref or similar identifier makes this extremely easy.

	opsworks stop my_stack my_layer --prefix git_6e84r37

### Deleting instances

Only stopped instances can be deleted.  Similar to stopping, you can delete instances matching a prefix or all instances in a layer.

#### Deleting all stopped instances in a layer

	opsworks delete my_stack my_layer --all-stopped

#### Deleting instances matching a prefix

	opsworks delete my_stack my_layer --prefix git_6e84r37


## License

MIT