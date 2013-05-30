import Skype4Py
import json
import tornado.ioloop
import tornado.iostream
import socket

def get_account():
	return {"fullName": skype.CurrentUser.FullName,
	          "handle": skype.CurrentUser.Handle,
	    "onlineStatus": skype.CurrentUser.OnlineStatus,
	        "moodText": skype.CurrentUser.MoodText}

def get_buddies():
	print "Getting buddy list (" + str(len(skype.Friends)) + ")"
	buddies = []
	for user in skype.Friends:
		buddy = {"fullName": user.FullName,
		           "handle": user.Handle,
		     "onlineStatus": user.OnlineStatus,
		         "moodText": user.MoodText}
		print buddy['handle']
		buddies.append(buddy)

	return {"account": skype.CurrentUser.Handle, "buddies": buddies}

def init():
	stream.read_until("\r\n", on_data)
	send_data({"type": "AccountInfo", "data": get_account()})
	send_data({"type": "BuddyList", "data": get_buddies()})

def on_data(data):
	obj = json.loads(data[0:data.find("\r\n")])
	if "type" in obj and "data" in obj:
		if obj['type'] == "SendMessage":
			if "handle" in obj['data'] and "message" in obj['data']:
				skype.SendMessage(obj['data']['handle'], obj['data']['message'])
			else:
				print "MISSING PARAMS:"
				print json.dumps(obj['data'], indent=4)
		elif obj['type'] == "SomethingElse":
			pass
		else:
			print "UNKNOWN TYPE: " + str(obj['type'])
	else:
		print "BAD DATA:"
		print json.dumps(obj, indent=4)
	stream.read_until("\r\n", on_data)

def send_data(data):
	stream.write(json.dumps(data) + "\r\n")

skype = Skype4Py.Skype()
skype.Attach()
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
stream = tornado.iostream.IOStream(s)
stream.connect(("aspire", 8081), init)
tornado.ioloop.IOLoop.instance().start()
