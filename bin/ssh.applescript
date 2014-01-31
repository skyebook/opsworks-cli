#!/usr/bin/osascript
-- With great gratitude to Matt Ball's post on coderwall
-- https://coderwall.com/p/3uq7gw

on run argv
	
	if (count of argv) = 0 then
		return "No hostname arguments supplied"
	else
		set hostnames to argv
	end if
	
	launch "iTerm"
	
	tell application "iTerm"
		activate
		
		-- ssh in split panes to my queue processor hosts
		set myterm to (make new terminal)
		tell myterm
			
			launch session "Default Session"
			
			-- If we're only opening a single session, return before setting up a multi-column layout
			if count of hostnames is 1 then
				tell the current session to write text "ssh -o StrictHostKeyChecking=no -i ~/.ssh/PlayKey.pem ubuntu@" & (item 1 of hostnames) & "\\"
				tell i term application "System Events" to keystroke return
				return
			end if
			
			-- split horizontally
			tell i term application "System Events" to keystroke "d" using command down
			-- move to upper split
			tell i term application "System Events" to key code 123 using {option down, command down}
			
			set num_hosts to count of hostnames
			
			-- Create the panes
			repeat with n from 1 to num_hosts
				-- Split downward
				if n > 1 and n < num_hosts then
					tell i term application "System Events" to keystroke "D" using command down
				end if
				
				if n mod 2 is 1 then
					-- move across
					tell i term application "System Events" to key code 123 using {option down, command down}
				else
					tell i term application "System Events" to key code 124 using {option down, command down}
				end if
				
				-- Add some delay to give iTerm time to switch to the next pane
				delay 0.1
				
				-- Put the SSH comment in the terminal and use a backslash as a hack so that it doesn't run
				tell the current session to write text "ssh -o StrictHostKeyChecking=no -i ~/.ssh/PlayKey.pem ubuntu@" & (item n of hostnames) & "\\"
			end repeat
			
			-- Turn on input broadcast
			tell i term application "System Events" to keystroke "I" using command down
			-- The return keystroke accepts the alert that pops up when turning on broadcast mode
			tell i term application "System Events" to keystroke return
			
			--  Connect the SSH sessions (this finishes the command that we left hanging before with the backslash)
			tell i term application "System Events" to keystroke return
			
			-- Zoom the window
			tell i term application "System Events" to keystroke "=" using {option down, command down}
		end tell
	end tell
end run