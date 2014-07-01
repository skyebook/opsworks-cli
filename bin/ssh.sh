#!/bin/bash

# Get the options passed in
while getopts n:u:i:o: option
do
	case $option in
		# This will be the name of the tmux session
		n) SESSION=$OPTARG;;
		# SSH key location
		i) KEY_PATH=$OPTARG;;
		# Username to log authenticate with
		u) USERNAME=$OPTARG;;
		# Pass through SSH options
		o) SSH_OPTIONS="$SSH_OPTIONS -o $OPTARG";;
	esac
done

# Adjust the arguments so the hostnames are queued up
shift $((OPTIND - 1))

# Create the tmux session with 256 colors because we aren't stuck in 1982
tmux -2 new-session -d -s $SESSION

HOSTS=("$@")

# Loop through the hosts, creating panes and SSH sessions as we go
for((i=0; i < ${#HOSTS[@]}; i++))
do
	# Sessions have a default first window, so only create a new pane on subsequent iterations
	if [ $i -gt 0 ]; then
		tmux split-window -h
	fi
	
	COMMAND="ssh $SSH_OPTIONS -i $KEY_PATH $USERNAME@${HOSTS[$i]}"
	#echo $COMMAND
	
	tmux select-pane -t $i
	
	#echo "THE COMMAND " $COMMAND
	tmux send-keys "$COMMAND" C-m
done

tmux set-window-option synchronize-panes on > /dev/null

tmux select-layout tiled > /dev/null

tmux attach -t $SESSION