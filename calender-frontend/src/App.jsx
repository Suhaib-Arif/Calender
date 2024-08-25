import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import Swal from 'sweetalert2';
import bootstrapPlugin from '@fullcalendar/bootstrap';
import "bootstrap/dist/css/bootstrap.min.css";
import { parse, format } from 'date-fns';
import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs from 'dayjs';

function App() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [refetchEvents, setRefetchEvents] = useState(false);
  const [value, setValue] = React.useState(dayjs());
  const [currentMonthYear, setCurrentMonthYear] = useState(dayjs().format('MMMM YYYY'));
  // const [startDate, setStartDate] = useState(new Date());
  const [monthYear, setMonthYear] = useState();



  // const [open, setOpen] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [refetchEvents]);


  const fetchEvents = () => {
    fetch('http://127.0.0.1:8000/events/get_events')
      .then((response) => response.json())
      .then((data) => {
        const transformedEvents = data.map((event) => ({
          id: event._id,
          title: event.title,
          start: event.duration,
          description: event.description,
          eventType: event.eventType,
          recurringEventId: event.recurringEventId
        }));
        setEvents(transformedEvents);
      })
      .catch((error) => console.error('Error fetching events:', error));
  };

  const handleRecurrEventEdit = (clickInfo) => {

    Swal.fire({
      title: 'Edit event',
      html: `

        <div>
          <input type="text" id="eventTitle" class="swal2-input" placeholder="Event Title" value="${clickInfo.event.title}">
        </div>
        <div>
          <select id="recurrenceType" class="swal2-select" value="${clickInfo.event.extendedProps.recurrType}">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <input type="datetime-local" id="recurrenceStartDate" class="swal2-input" placeholder="Event Date">
        </div>
        <div>
          <input type="datetime-local" id="recurrenceEndDate" class="swal2-input" placeholder="End Date" value="${clickInfo.event.startDate}">
        </div>
        <div>
          <textarea id="eventDesc" class="swal2-textarea" rows="5" cols="20" placeholder="Event Description">${clickInfo.event._def.extendedProps.description}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save changes',
      preConfirm: () => {
        const eventTitle = Swal.getPopup().querySelector('#eventTitle').value;
        const eventDesc = Swal.getPopup().querySelector('#eventDesc').value;
        const startDate = Swal.getPopup().querySelector('#recurrenceStartDate').value;
        const endDate = Swal.getPopup().querySelector('#recurrenceEndDate').value;
        const recurrenceType = Swal.getPopup().querySelector("#recurrenceType").value;
  
        if (!eventTitle || !startDate || !endDate) {
          Swal.showValidationMessage('Please enter both a title and a date.');
          return false;
        }
  
        return { eventTitle, eventDesc, startDate, endDate, recurrenceType};
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { eventTitle, eventDesc, startDate, endDate, recurrenceType } = result.value;
        console.log("The recurnceId ");
        console.log(clickInfo.event.extendedProps.eventType);
  
        fetch(`http://127.0.0.1:8000/events/update_recurrence_event/${clickInfo.event._def.extendedProps.recurringEventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: eventTitle,
            description: eventDesc,
            recurrencestartDate: startDate,
            recurrenceendDate: endDate,
            eventType: clickInfo.event.extendedProps.eventType,
            recurrType: recurrenceType
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            Swal.fire('Success', 'Event has been updated!', 'success');
            setRefetchEvents((prev) => !prev);
          })
          .catch((error) => {
            console.error('Error updating event:', error);
            Swal.fire('Error', 'There was an error updating the event.', 'error');
          });
      }
    });
  };
  
  const handleRecurrEventDelete = (clickInfo) => {
    // console.log(clickInfo.event._def.extendedProps.recurringEventId);
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete the event "${clickInfo.event.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:8000/events/delete_recurrent_event/${clickInfo.event._def.extendedProps.recurringEventId}`, {
          method: 'DELETE',
        })
          .then((response) => response.json())
          .then((data) => {
            Swal.fire('Deleted!', 'Your event has been deleted.', 'success');
            setRefetchEvents((prev) => !prev);
          })
          .catch((error) => {
            console.error('Error deleting event:', error);
            Swal.fire('Error', 'There was an error deleting the event.', 'error');
          });
      }
    });
  };
  
  const handleRecurrEventClick = (clickInfo) => {
    console.log(clickInfo.event)
    Swal.fire({
      title: "Modify Reoccuring Event",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Edit',
      denyButtonText: 'Delete'
    }).then((result) => {
      if (result.isConfirmed){
        console.log(clickInfo)
        handleRecurrEventEdit(clickInfo);
      } else if(result.isDenied) {
        handleRecurrEventDelete(clickInfo);
      }
    })
  };
  
  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
  
    const colorMap = {
      'Task': 'lightblue',
      'Calling': 'lightgreen',
      'Meeting': 'lightcoral',
    };
  
    const isRecurring = event._def.extendedProps.recurringEventId != "None";
    const backgroundColor = colorMap[event.extendedProps.eventType] || 'lightgray';
  
    const handleIconClick = (e) => {
      e.stopPropagation(); // Prevent click event from bubbling up
      handleRecurrEventClick(eventInfo); // Pass eventInfo to the handler
    };
  
    return (
      <div className={`event-content ${isRecurring ? 'recurring' : ''}`} style={{ backgroundColor, borderRadius: "10px", width: "80%",height:"70%", position: "relative", padding: "10px" }}>
        {isRecurring && (
          <div className="recurring-icon" style={{position: "absolute", top: "-10px", right: "-100px"}}>
            <img
              src="https://img.icons8.com/?size=20&id=78746&format=png&color=000000"
              alt="Recurring Event Icon"
              onClick={handleIconClick}
            />
          </div>
        )}
        <strong>{event.title}</strong>
      </div>
    );
  };
  
  

  const handleDateSelect = (selectedDate) => {
    const formattedDate = selectedDate.startStr + "T01:00"; // Format the selected date
    setValue(dayjs(selectedDate));
  
    let selectedEventType = '';

    window.toggleRecurrenceOptions = (value) => {
      const recurrenceOptionsDiv = document.getElementById('recurrenceOptions');
      const recurrenceEndDate = document.getElementById("EndDate");
      if (value === 'yes') {
        recurrenceOptionsDiv.style.display = 'block';

      } else {
        recurrenceOptionsDiv.style.display = 'none';

      }
    };
    
  
    Swal.fire(
      
      {
      
      title: 'Create a Event',
      html: `
        <div class="btn-group" role="group" aria-label="Basic outlined example">
          <button type="button" id='taskButton' class="btn btn-outline-secondary">Task</button>
          <button type="button" id='callingButton' class="btn btn-outline-secondary">Calling</button>
          <button type="button" id='meetingButton' class="btn btn-outline-secondary">Meeting</button>
        </div>
        <div>
          <input type="text" id="eventTitle" class="swal2-input" style='width:200px' placeholder="Event Title">
        </div>
        
        <div>
        <input type="datetime-local" id="eventDate" style='width:200px' class="swal2-input" placeholder="Start Date" value="${formattedDate}">
        </div>
        <div>
        <textarea id="eventDesc" class="swal2-textarea" rows="5" cols="20" style='width:200px' placeholder="Event Description"></textarea>
        </div>
        <div>
          <select id="isRecurrence" class="swal2-select" onchange="toggleRecurrenceOptions(this.value)">
            <option value="no">No Recurrence</option>
            <option value="yes">Yes, Recurrence</option>
          </select>
        </div>

        <div id="recurrenceOptions" style="display:none;">
          <div>
            <select id="recurrenceType" class="swal2-select">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <input type="datetime-local" id="EndDate" style='width:200px' class="swal2-input" placeholder="End Date">
          </div>
          
        </div>

      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Event',
      didOpen: () => {
        
        const taskButton = Swal.getPopup().querySelector('#taskButton');
        const callingButton = Swal.getPopup().querySelector('#callingButton');
        const meetingButton = Swal.getPopup().querySelector('#meetingButton');

  
        taskButton.addEventListener('click', () => {
          selectedEventType = 'Task';
          taskButton.classList.add('active');
          callingButton.classList.remove('active');
          meetingButton.classList.remove('active');
        });
  
        callingButton.addEventListener('click', () => {
          selectedEventType = 'Calling';
          taskButton.classList.remove('active');
          callingButton.classList.add('active');
          meetingButton.classList.remove('active');
        });
  
        meetingButton.addEventListener('click', () => {
          selectedEventType = 'Meeting';
          taskButton.classList.remove('active');
          callingButton.classList.remove('active');
          meetingButton.classList.add('active');
        });
      },
      preConfirm: () => {
        const eventTitle = Swal.getPopup().querySelector('#eventTitle').value;
        const eventDate = Swal.getPopup().querySelector('#eventDate').value;
        const eventDesc = Swal.getPopup().querySelector('#eventDesc').value;
        const isRecurrence = Swal.getPopup().querySelector('#isRecurrence').value;
        let recurrenceType = 'no recurrence';
        let Enddate = " ";

        if (isRecurrence === 'yes'){
          recurrenceType = Swal.getPopup().querySelector("#recurrenceType").value;
          Enddate = Swal.getPopup().querySelector("#EndDate").value;
        }

        if (!eventTitle || !eventDate) {
          Swal.showValidationMessage('Please enter both a title and a date.');
          return false;
        }
  
        if (!selectedEventType) {
          Swal.showValidationMessage('Please select an event type.');
          return false;
        }

        console.log("The events are as", eventTitle, eventDate, eventDesc, selectedEventType, recurrenceType, Enddate)
  
        return { eventTitle, eventDate, eventDesc, selectedEventType, recurrenceType, Enddate };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { eventTitle, eventDate, eventDesc, selectedEventType, recurrenceType, Enddate } = result.value;

        let apiUrl = '';
        let bodyData = {};

        console.log(result.value); 
      
        if (recurrenceType === 'no recurrence') {
          apiUrl = 'http://127.0.0.1:8000/events/add_event';
          bodyData = {
            title: eventTitle,            // Correctly use the destructured variables
            description: eventDesc,       // Correctly use the destructured variables
            duration: eventDate,          // Correctly use the destructured variables
            eventType: selectedEventType, // Correctly use the destructured variables
          };
        } else {
          apiUrl = 'http://127.0.0.1:8000/events/add_event_recurring';
          bodyData = {
            title: eventTitle,               // Correctly use the destructured variables
            description: eventDesc,          // Correctly use the destructured variables
            recurrencestartDate: eventDate,  // Correctly use the destructured variables
            recurrenceendDate: Enddate,      // Correctly use the destructured variables
            eventType: selectedEventType,    // Correctly use the destructured variables
            recurrType: recurrenceType       // Correctly use the destructured variables
          };
        }
  
            fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(bodyData),
            })
              .then((response) => response.json())
              .then((data) => {
                Swal.fire('Success', 'Event(s) have been added to the calendar!', 'success');
                setRefetchEvents((prev) => !prev);
              })
              .catch((error) => {
                console.error('Error creating event:', error);
                Swal.fire('Error', 'There was an error creating the event.', 'error');
              });
          }
        });
      }




  const handleEventClick = (clickInfo) => {
    const eventTitle = clickInfo.event.title;
    const eventDescription = clickInfo.event.extendedProps.description || 'No description provided';
    const eventDate = clickInfo.event.startStr;

    Swal.fire({
      title: 'Event Details',
      html: `
        <div><strong>Title:</strong> ${eventTitle}</div>
        <div><strong>Date:</strong> ${eventDate}</div>
        <div><strong>Description:</strong> ${eventDescription}</div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Edit',
      denyButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) {
        handleEventEdit(clickInfo);
      } else if (result.isDenied) {
        handleEventDelete(clickInfo);
      }
    });
  };




  const handleEventEdit = (clickInfo) => {
    Swal.fire({
      title: 'Edit event',
      html: `
        <div>
          <input type="text" id="eventTitle" class="swal2-input" placeholder="Event Title" value="${clickInfo.event.title}">
        </div>
        <div>
          <input type="date" id="eventDate" class="swal2-input" placeholder="Event Date" value="${clickInfo.event.startStr}">
        </div>
        <div>
          <textarea id="eventDesc" class="swal2-textarea" rows="5" cols="20" placeholder="Event Description">${clickInfo.event.extendedProps.description || ''}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save changes',
      preConfirm: () => {
        const eventTitle = Swal.getPopup().querySelector('#eventTitle').value;
        const eventDate = Swal.getPopup().querySelector('#eventDate').value;
        const eventDesc = Swal.getPopup().querySelector('#eventDesc').value;

        if (!eventTitle || !eventDate) {
          Swal.showValidationMessage('Please enter both a title and a date.');
          return false;
        }

        return { eventTitle, eventDate, eventDesc };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { eventTitle, eventDate, eventDesc } = result.value;

        fetch(`http://127.0.0.1:8000/events/update_event/${clickInfo.event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: eventTitle,
            description: eventDesc,
            duration: eventDate,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            Swal.fire('Success', 'Event has been updated!', 'success');
            setRefetchEvents((prev) => !prev);
          })
          .catch((error) => {
            console.error('Error updating event:', error);
            Swal.fire('Error', 'There was an error updating the event.', 'error');
          });
      }
    });
  };



  const handleEventDelete = (clickInfo) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete the event "${clickInfo.event.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:8000/events/delete_event/${clickInfo.event.id}`, {
          method: 'DELETE',
        })
          .then((response) => response.json())
          .then((data) => {
            Swal.fire('Deleted!', 'Your event has been deleted.', 'success');
            setRefetchEvents((prev) => !prev);
          })
          .catch((error) => {
            console.error('Error deleting event:', error);
            Swal.fire('Error', 'There was an error deleting the event.', 'error');
          });
      }
    });
  };

  const handleTodayClick = () => {
    setValue(dayjs()); // Set the DateCalendar to today
    const calendarApi = calendarRef.current.getApi();
    calendarApi.today(); // Set FullCalendar to today
  };

  const handlePrevMonthClick = () =>{
    setValue(value.subtract(1, 'month'));
    const calendarApi = calendarRef.current.getApi();
    calendarApi.prev(); // Go to the next view in FullCalendar    
  };
  const handleNextMonthClick = () =>{
    setValue(value.add(1, 'month'));
    const calendarApi = calendarRef.current.getApi();
    calendarApi.next(); // Go to the next view in FullCalendar    
  };

  const getMeanDate = (start, end) => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const meanDate = startDate.add(endDate.diff(startDate) / 2, 'millisecond');
    return meanDate;
  };

  const getCurrentMonthYear = (date) => {
    const meanDate = getMeanDate(date.start, date.end);

    return meanDate.format('MMMM YYYY');
  };

  const goToMonthView = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView('dayGridMonth');
  };

  const goToWeekView = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView('timeGridWeek');
  };

  const goToDayView = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView('timeGridDay');
  };

  const goToListView = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView('listMonth');
  };

  

  return (
  <div className="bg-light" > 
<nav className="navbar navbar-expand-lg navbar-light bg-white" style={{ height: '70px', backgroundColor: '#f8f9fa', borderRadius: "25px", padding: "20px"}}>
  {/* <a className="navbar-brand" href="#">Navbar</a> */}
  {/* <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation"> */}
    {/* <span className="navbar-toggler-icon"></span> */}
  {/* </button> */}
  <div className="collapse navbar-collapse" id="navbarNav">
    <ul className="navbar-nav">
      <li className="nav-item active">
        <a href="#" className="btn btn-outline-secondary" onClick={handleTodayClick}>Today</a>
      </li>
      <li className="nav-item">
        <a href="#" className="btn" onClick={handlePrevMonthClick}>&lt;</a>
      </li>
      <li className="nav-item">
        <a href="#" className="btn" onClick={handleNextMonthClick}>&gt;</a>
      </li>
    </ul>
    <div className='mx-auto'>
      <h3 className="nav-link disabled" href="#">{monthYear}</h3>
    </div>
    <ul className="navbar-nav ms-auto">
      <li className="nav-item">
        <a onClick={goToMonthView} className="btn">Month View</a>
      </li>
      <li className="nav-item">
        <a onClick={goToWeekView} className="btn">Week View</a>
      </li>
      <li className="nav-item">
        <a onClick={goToDayView} className="btn">Day View</a>
      </li>
      <li className="nav-item">
        <a onClick={goToListView} className="btn">List View</a>
      </li>
    </ul>
  </div>
</nav>


<div className="mt-5 bg-white" style={{paddingTop: "30px", borderRadius: "25px", padding: "10px"}}>
    
    <div>
      <div className="row d-flex">
        {/* Date Calendar */}
        <div className="col-md-4 d-flex">
          <div className="container" >
          <div className="row align-items-center justify-content-start" style={{ paddingLeft: '5vh' }}>
            <button type='button' className='btn w-25 p-3 btn-outline-secondary' onClick={() => {handleDateSelect(value)}}>Create</button>
          </div>
          <div className="row">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DemoContainer components={['DateCalendar', 'DateCalendar']}>
            <DemoItem style={{ width: '100%' }}>
              <DateCalendar 
                value={value} 
                onChange={(newValue) => {
                  setValue(newValue); // Update state with the selected date
                  handleDateSelect(newValue); // Pass the selected date to the function
                }} 
              />
            </DemoItem>
          </DemoContainer>
        </LocalizationProvider>
        </div>
        <div className="row">
        <table style={{ width: "60%"}}>
          <tbody>
            <tr style={{backgroundColor: "lightblue", display: 'flex', marginBottom: '10px', borderRadius: "10px"}}>
              <td>Task</td>
            </tr>
            <tr style={{backgroundColor: 'lightcoral', display: 'block', marginBottom: '10px', borderRadius: "10px"}}>
              <td>Meeting</td>
            </tr>
            <tr style={{backgroundColor: 'lightgreen', display: 'block', marginBottom: '10px', borderRadius: "10px"}}>
              <td>Calling</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      </div>
  
        {/* FullCalendar */}
        <div className="col-md-8">
          <FullCalendar
            ref={calendarRef}
            timeZone="local"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, bootstrapPlugin]}
            initialView="dayGridMonth"
            height={600}
            select={handleDateSelect}
            events={events}
            eventContent={renderEventContent}
            headerToolbar={false} // Disable the header toolbar
            footerToolbar={false} // Optionally disable the footer toolbar
            selectable={true}
            eventClick={handleEventClick}
            datesSet={(info) => {
              const monthYear = getCurrentMonthYear(info);
              setMonthYear(monthYear)
            }}
          />
        </div>
      </div>
    </div>

    </div>
    </div>
  );
    
}
  

export default App;
