from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pymongo
from datetime import datetime
from bson.objectid import ObjectId
from pandas import date_range, DateOffset

app = FastAPI()

app.add_middleware(
 CORSMiddleware,
 allow_origins=["http://localhost:5173"], # Add your frontend origin here
 allow_credentials=True,
 allow_methods=["*"],
 allow_headers=["*"],
 )

class Events(BaseModel):
    title: str
    description: str
    duration: datetime
    eventType: str

class Recurr_events(BaseModel):
    title: str
    description: str
    recurrencestartDate: datetime
    recurrenceendDate: datetime
    eventType: str
    recurrType: str

# MongoDB connection
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["events"]
events_collection = db["events"]

@app.post("/events/add_event")
async def add_event(events: Events):
    event = events_collection.find_one({"title": events.title, "description": events.description, "duration": events.duration})
    if event is not None:
        return {"message": "Event already exists"}

    event_dic = events.dict()
    event_dic["recurringEventId"] = None
    evnt = events_collection.insert_one(event_dic)
    return str(evnt.inserted_id)

@app.post("/events/add_event_recurring")
async def add_recurring_events(recurr_events: Recurr_events, recurring_event_id = None):
    
    if recurr_events.recurrType == "no recurrence":
        event = Events(title=recurr_events.title, description=recurr_events.description, duration=recurr_events.recurrencestartDate, eventType=recurr_events.eventType)
        
        return await add_event(event)
    
    reoccuring_events = recurr_events.dict()
    reccur_type = reoccuring_events["recurrType"]

    if recurring_event_id is None:
        recurring_event_id = ObjectId()

    if reccur_type == "daily":
        recurring_dates = date_range(reoccuring_events["recurrencestartDate"], reoccuring_events["recurrenceendDate"])
    elif reccur_type == "weekly":
        recurring_dates = date_range(reoccuring_events["recurrencestartDate"], reoccuring_events["recurrenceendDate"], freq="7D")
    elif reccur_type == "monthly":
        recurring_dates = date_range(reoccuring_events["recurrencestartDate"], reoccuring_events["recurrenceendDate"], freq=DateOffset(months=1))
    
    for dates in recurring_dates:
        event = {
            "title" : reoccuring_events["title"],
            "description": reoccuring_events["description"],
            'duration': dates,
            "eventType": reoccuring_events["eventType"],
            "recurringEventId": ObjectId(recurring_event_id)
        }
        events_collection.insert_one(event)
    
    return True

@app.delete("/events/delete_recurrent_event/{recurring_event_id}")
async def delete_recurrent_event(recurring_event_id):
    print(recurring_event_id)
    result = events_collection.delete_many({"recurringEventId": ObjectId(recurring_event_id)})
    return True

@app.put("/events/update_recurrence_event/{recurring_event_id}")
async def update_recurrent_event(recurring_event_id: str, event: Recurr_events):
    try:
        # Convert recurring_event_id to ObjectId
        object_id = ObjectId(recurring_event_id)
        
        # Delete all events with the given recurringEventId
        delete_result = events_collection.delete_many({"recurringEventId": object_id})

        if delete_result.acknowledged:
            print(f"Deleted {delete_result.deleted_count} events with recurringEventId: {recurring_event_id}")

            # Create new events by calling the helper function `add_recurring_events`

            await add_recurring_events(event, recurring_event_id=recurring_event_id)
            return {"success": True, "message": "Events updated successfully."}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete events.")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/events/get_events")
async def get_events():
    items = events_collection.find({})
    event_list = [
        {
            "_id": str(item["_id"]),
            "title": item["title"],
            "description": item["description"],
            "duration": item["duration"].isoformat(),
            "eventType": item["eventType"],
            "recurringEventId" : str(item["recurringEventId"])
        }
        for item in items
    ]
    # print(event_list)
    return event_list


@app.delete("/events/delete_event/{event_id}")
async def delete_event(event_id: str):
    # print(event_id)
    query = {"_id": ObjectId(event_id)}
    event = events_collection.find_one(query)
    if event is None:
        return {"message": "Event not found"}
    
    event = events_collection.delete_one(event)
    return event.acknowledged

@app.put("/events/update_event/{event_id}")
async def update_event(event_id: str, events: Events):
    query = {"_id": ObjectId(event_id)}
    event = events_collection.find_one(query)
    if event is None:
        return {"message": "Event not found"}
    
    # Construct the updated fields
    updated_event = {
        "title": events.title,
        "description": events.description,
        "duration": events.duration
    }
    
    # Use the query with the original _id to update the event
    result = events_collection.update_one(query, {"$set": updated_event})

    return True


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")






