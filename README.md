# Particle IoT

Homey side application for integration with Particle.io IoT Platform

This application is designed for developers and hobbyists making their own
custom devices, and does not currently support Particle Product level webhooks.

Much of the functionality is provided by the Particle JS API (particle-api-js).

This app interacts with Particle.io IoT platform. There is a companion library
which can be included in Particle projects which can be found at:
     INSERTLINKHERE
This library should make things a lot easier Particle side, providing a lot of
the required functionality discussed below.

The following Particle Cloud Variables and Functions are used:

  Events
    Homey - Integration Webhook to Athom Cloud

  Variables
    HomeyAPI    - Boolean - Indicates Particle Device wants to talk to Homey
    HomeyClass  - String - Basic information about the device
    HomeyCaps   - String - Further information about device capabilities
    HomeyConfs  - String - List of device configuration settings
    HomeyActs   - String - List of Actions that could be called from a Flow

  Functions
    HomeyConf   - Set a configuration item (e.g. set reporting interval)
    HomeyGet    - Ask for device data to be sent (e.g. measure_power)
    HomeySet    - Set device data (e.g. onoff)
    HomeyAct    - Ask for an Action to be performed


This application uses an Athom Cloud Webhook to function.

The webhook is used to pass device events from the Particle Cloud to the Homey
Cloud and then to the application. Think of these like Z-Wave reports.
In future I may add data flow the other way too (by subscribing the Particle
devices to the webhook as well)

You will also need to enter credentials for your Particle IO platform. These
are not stored, but simply used once to generate an authentication token
(which is stored in the App). The token will give complete access to the
user account on Particle, so read the code if you have any concerns about
security!

With this token, the application will perform the following type of functions:
      List Particle devices
      Query status of devices
      Query variables and functions on devices
      Call functions on devices
      Create an Integration Webhook

The application will configure a Webhook Integration called "Homey" on the
Particle Cloud. If this Webhook already exists it will check the settings and
if necessary it will delete and recreate it.

At present this means, one Particle user <-> one Homey.

At a basic level on the Particle devices, the Events can now be published to
Homey as follows:

    void loop() {
      // Get some data
      String data = String(64);

      // Trigger the webhook
      Particle.publish("Homey", data, PRIVATE);

      // Wait 60 seconds
      delay(60000);
    }

Think of this as a channel between all the Particle devices and the Homey app.
More on using this below (see Operation)


Pairing

Once logged into Particle Cloud, pairing can be completed as normal. In the
Homey devices screen Add a Particle IoT device. The app will retrieve a list
of available devices. To be eligible for pairing with Homey the device must
      expose a Boolean variable called "HomeyAPI", which must be True
      be Online

e.g. on the Particle device:      
      boolean myHomeyAPI = True;

      void setup() {
        Particle.variable("HomeyAPI", myHomeyAPI);
      }

Simply select the device that you want to pair with.

The App will then attempt to pull back a variable called "HomeyClass", which
must be a String type, and should contain a Homey Class as per:
     https://developer.athom.com/docs/apps/tutorial-Drivers-Reference.html
The match is case insensitive, but must be otherwise exact. If the variable
does not exist or does not match properly, the Class will be assumed to be
"Other".
Multiple "sub" sensor instances are supported. These must be first declared in
HomeyClass. These instances are defined in order, using JSON. Instance "0" must
always exist.

{[
  "0": "sensor",
  "1": "thermostat"
  ]}

e.g. on the Particle device:      
      String myHomeyClass0 = "{[\"0\":\"sensor\",\"1\":\"thermostat\"]}";

      void setup() {
        Particle.variable("HomeyClass", myHomeyClass);
      }


The App will then attempt to pull back a variable called "HomeyCaps", which must
be a String type, in JSON list array format, containing a list of the Homey
capabilities that it supports, as per the list here:
     https://developer.athom.com/docs/apps/tutorial-Drivers-Reference.html

There is a limit (18) to the number of capabilities you can advertise as the
maximum string length for published variables is 622 bytes. You must include
capabilities for all nodes.

{[
  "0": [ "measure_power", "meter_power" ]
  "1": [ "measure_temperature", "target_temperature", "thermostat_mode" ]
  ]}


e.g. on the Particle device:      
      char myHomeyCaps[622];

      void setup() {
        sprintf(myHomeyCaps,"{[\"0\":[\"measure_power\",\"meter_power\"]]}"
        Particle.variable("HomeyCaps", myHomeyCaps);
      }

To reduce the number of variables the device has to advertise, all configuration
settings are compressed into a single RO variable. See later in this doc for how
to change them. The settings variable is called "HomeyConfs", which must be a
String type, and should be in JSON format. Settings are discovered during
pairing, so must include type. Type is limited to:
          boolean (0)
          integer(1)
          double(2)
Field names are short to reduce resultant string length (name = n, type = t,
value = v). The value will be taken as the default during pairing, but the
variable should always be kept "up to date" as it could be read at any time.

JSON Format:
    {
      [
        {
          "n": "setting01",
          "t": 0,
          "v": true
        },
        {
          "n": "setting02",
          "t": 1,
          "v": 123
        },
      ]
    }

    e.g. on the Particle device:      
          char myHomeyConfs[622];
          boolean mySetting01 = true;
          int mySetting02 = 123

          void setup() {
            sprintf(myHomeyConfs,"{[{\"n\",\"Setting 01\",\"t\": 0, \"v\": %d},\
                                   {\"n\",\"Setting 02\",\"t\": 1, \"v\": %d}\
                                   ]}",mySetting01,mySetting02);
            Particle.variable("HomeyConfs", myHomeyConfs);
          }

    NB, using a Particle Library like SparkJson or JsonParserGeneratorRK can
    make this a lot easier!

The App will then attempt to pull back a variable called "HomeyActs", which must
be a String type, in JSON format, containing a list of the Actions
that the device can perform. Please note that Actions are additional to
capabilities that can be SET. For instance, "onoff" is a capability that is
settable, so there is no need for an "Action". Note that Actions are accessed
in Homey through Flows. Actions have a handle, and a more friendly description.

  {[
    "0": {
           "action01": "Clever Action 01"
           "action02": "Clever Action 02"
         },
    "1": {}
  ]}


A note about Particle variables, up to 20 cloud variables may be registered and
each variable name is limited to a maximum of 12 characters, so be aware the
Homey application uses at least NUMBER of these. The maximum string length for
published variables is 622 bytes.

Up to 15 cloud functions may be registered and each function name is limited to
a maximum of 12 characters. A cloud function is set up to take one argument of
the String datatype. This argument length is limited to a max of 63 characters

Finally the pairing will check that it can successfully call a function called
HomeyConf on the device. This must be exposed and return same integer as is
sent when the test function is used. This is used for configuration settings.
Configuration settings should be set one at a time.

// EXAMPLE USAGE

  #include "JsonParserGeneratorRK.h"

  int HomeyConf(String newSettings);

  // Global parser that supports up to 256 bytes of data and 20 tokens
  JsonParserStatic<256, 20> parser1;

  void setup()
  {
    // register the cloud function
    Particle.function("HomeyConf", HomeyConf);
  }

  void loop()
  {
    // this loops forever
  }

  // this function automagically gets called upon a matching POST request
  int newHomeyConfig(String newSettings)
  {
    // newSettings will be JSON formatted String
    // { "setting_name": value }
    // Clear the parser state, add the string, and parse it
    parser1.clear();
    parser1.addString(newSettings);
    // Check we've got valid JSON
    if (!parser1.parse()) {
      Serial.println("E1 parsing failed in newHomeyConfig");
      return -1;
    }

    // Try to extract the setting name and settingValue
    // We only do ONE at a time, so just get the first key value pair
    // Silently ignore everything else.
    String settingName;
    int settingValue;
    if (!parser1.getOuterKeyValueByIndex(0, settingName, settingValue)) {
  		Serial.println("E2 failed to get a name and value in newHomeyConfig");
  		return -1;
	  }

    // Process the results

    // PairingTest response.
    if(settingName == "PairingTest")
    {
      return settingValue;
    }

    // Example setting handler
    if(settingName == "YourSetting")
    {
      if(setYourSetting(settingValue))
      {
        return settingValue
      } else {
        Serial.println("E3 failed set setting in newHomeyConfig");
        return -1
      }
    }
    Serial.println("E4 failed match setting name in newHomeyConfig");
    return -1;
  }


Polling (Data to Homey) - HomeyGet

Your device may be asked by Homey, depending on if you enable polling (TODO),
to report on any particular capability. This is done by called the "HomeyGet"
cloud function. The request will be in JSON format, with instance and capability
identified. Note that the GET doesn't return the data, rather it triggers a
report to be sent.

{
  "i": "instanceid",
  "c": "capability_name"
}

// EXAMPLE CODE

  #include "JsonParserGeneratorRK.h"

  int myHomeyGet(String myRequest);

  // Global parser that supports up to 256 bytes of data and 20 tokens
  JsonParserStatic<256, 20> parser1;

  void setup()
  {
    // register the cloud function
    Particle.function("HomeyGet", myHomeyGet);
  }

  void loop()
  {
    // this loops forever
  }

  // this function automagically gets called upon a matching POST request
  int myHomeyGet(String myRequest);
  {
    // myRequest will be JSON formatted String
    // { "i": "instanceid",
    //   "c": "capability_name" }
    // Clear the parser state, add the string, and parse it
    parser1.clear();
    parser1.addString(myRequest);
    // Check we've got valid JSON
    if (!parser1.parse()) {
      Serial.println("E1 parsing failed in myHomeyGet");
      return -1;
    }

    // Grab the instance and capability
    // We only do ONE at a time, so just get the first key value pair
    // Silently ignore everything else.
    String instanceID;
    String capabilityName;
    if (!parser1.getOuterKeyValueByIndex(0, instanceID, capabilityName)) {
  		Serial.println("E2 failed to get a name and value in myHomeyGet");
  		return -1;
	  }

    // Process the results

    // Instance 0 report triggers
    if(instanceID == "0")
    {
      if (capabilityName =="measure_power")
      {
        // Try and send the right report.
        if (mynode0_power_send_report) {
          return 1;
        } else {
          // Report sending must have failed
          Serial.println("E3 failed sending report in myHomeyGet");
          return -1;
        }
      }
      // No other capabilities
      Serial.println("E4 failed to find capability myHomeyGet");
      return -1;
    } else {
      // No other instances
      Serial.println("E4 failed to find instance myHomeyGet");
      return -1;
    }
  }


Control (Homey to Device) - HomeySet

Your device may be asked by Homey to set the value of any particular setable
capability. This is done by called the "HomeySet" cloud function. For example,
you would use this to turn a device on or off using the "onoff" capability.
The request will be in JSON format, with instance and capability identified.

{
  "i": "0",               // Instance ID
  "c": "onoff",           // Capability Name
  "v": 1                  // Value to set
}

// EXAMPLE CODE

  #include "JsonParserGeneratorRK.h"

  int myHomeySet(String myRequest);

  // Global parser that supports up to 256 bytes of data and 20 tokens
  JsonParserStatic<256, 20> parser1;

  void setup()
  {
    // register the cloud function
    Particle.function("HomeySet", myHomeySet);
  }

  void loop()
  {
    // this loops forever
  }

  // this function automagically gets called upon a matching POST request
  int myHomeySet(String myRequest);
  {
    // myRequest will be JSON formatted String
    // { "i": "instanceid",
    //   "c": "capability_name"
    //   "v": newvalue }
    // Clear the parser state, add the string, and parse it
    parser1.clear();
    parser1.addString(myRequest);
    // Check we've got valid JSON
    if (!parser1.parse()) {
      Serial.println("E1 parsing failed in myHomeySet");
      return -1;
    }

    // Grab the instance and capability
    // We only do ONE at a time, so just get the first key value pair
    // Silently ignore everything else.
    String instanceID;
    String capabilityName;
    int settingValue;
    // NB in this example we ASSUME we're dealing with integers
    // you should not.
    if (!parser1.getOuterKeyValueByIndex(0, instanceID, capabilityName, settingValue)) {
  		Serial.println("E2 failed to get a name and value in myHomeySet");
  		return -1;
	  }

    // Process the results

    // Instance 0 report triggers
    if(instanceID == "0")
    {
      if (capabilityName =="onoff")
      {
        // Try and set the value
        if (mynode0_power_set(settingValue)) {
          return 1;
        } else {
          // Report sending must have failed
          Serial.println("E3 failed setting value in myHomeySet");
          return -1;
        }
      }
      // No other capabilities
      Serial.println("E4 failed to find capability myHomeySet");
      return -1;
    } else {
      // No other instances
      Serial.println("E4 failed to find instance myHomeySet");
      return -1;
    }
  }



Reports (Data To Homey)

Your device can send it's data using the Webhook. It should do this in response
to a GET request (see above), or according to your periodic reporting settings
or whatever other event you think is appropriate.

  void loop() {
    // Get some data
    String data = String(64);

    // Trigger the webhook
    Particle.publish("Homey", data, PRIVATE);

    // Wait 60 seconds
    delay(60000);
  }

The data should be in JSON format, and should correspond to one or more
Homey capabilities. As published events have a limit of 64 characters, only one
variable can be sent at a time:

{
  "0": {
    "measure_temperature": 23.5
  }
}

The data should then appear in your Device on Homey. Yay!

IMPORTANT NOTE: Publish events are limited to 1 per second. For IoT applications
that should generally be sufficient, but you need to be aware of it. So, for
example, if you build a board that measures twenty different temperatures,
you will have to pace the updates to Homey carefully. If your project responds
dynamically to changes, you need to consider how you will deal rate-limiting
your events when conditions are volatile.


Actions (Data From Homey)

TODO
