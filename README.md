# Smart-Event-Booling-Management

## Project Overview

SmartEvent is a full-stack web application that allows users to discover events, book tickets, and manage their bookings. It provides event management and analytics features for organizers and administrators.

## Technologies Used

**Backend**

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* JWT Authentication
* Passlib and bcrypt
* SQLite

**Frontend**

* React
* Vite
* React Router
* Axios
* Recharts
* CSS

## Main Features

### 1. User Authentication

* User registration and login.
* Password hashing.
* JWT-based authentication.
* User profile management.
* Role-based access control.

### 2. Event Discovery

* Browse available events.
* View event details.
* Search and filter events.
* View event dates, locations, categories, and ticket prices.
* Display event status.

### 3. Ticket Booking

* Book tickets for events.
* Check ticket availability.
* Calculate booking totals.
* Generate tickets with QR codes.
* View booking history and tickets.

### 4. Notifications

* Receive booking and event-related notifications.
* View notifications in the user interface.
* Manage notification status.

### 5. Organizer Dashboard

* Create, update, and cancel events.
* Manage organizer-owned events.
* View event bookings.
* Track tickets sold and remaining.
* Analyze bookings and revenue.

### 6. Event Status Management

* Upcoming, ongoing, completed, and cancelled event statuses.
* Validate event dates.
* Restrict bookings for events that cannot be booked.
* Notify users about event updates and cancellations.

### 7. Admin Dashboard & Analytics

* View overall application statistics.
* Manage users and roles.
* View and manage events.
* Review recent bookings.
* Export booking reports as CSV.
* Visualize event and booking statistics.

## Project Structure

```text
SmartEvent/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── events.py
│   │   │   ├── bookings.py
│   │   │   ├── tickets.py
│   │   │   ├── notifications.py
│   │   │   ├── organizer.py
│   │   │   └── admin.py
│   │   ├── static/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── dependencies.py
│   │   └── event_service.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

* Python
* Node.js and npm
* A terminal or command prompt

### 1. Backend Setup

Open PowerShell and run:

```powershell
cd "C:\Users\G . Jaswanth\SmartEvent\backend"

python -m venv venv

.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Configure the backend `.env` file with the required environment variables, including a secure JWT secret key and the database URL if your application uses environment-based configuration.

Start the backend:

```powershell
uvicorn app.main:app --reload
```

Backend URL:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 2. Frontend Setup

Open a second PowerShell terminal:

```powershell
cd "C:\Users\G . Jaswanth\SmartEvent\frontend"

npm install

npm run dev
```

Open the frontend URL shown in the terminal, usually:

http://localhost:5173

## API Modules

| Module                  | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `/api/v1/auth`          | Registration and login                   |
| `/api/v1/users`         | User profile                             |
| `/api/v1/events`        | Event discovery and management           |
| `/api/v1/bookings`      | Ticket bookings                          |
| `/api/v1/tickets`       | Ticket information                       |
| `/api/v1/notifications` | User notifications                       |
| `/api/v1/organizer`     | Organizer dashboard and analytics        |
| `/api/v1/admin`         | Admin dashboard, management, and reports |

Refer to Swagger UI for the available endpoints and request formats.

## User Roles

* **USER:** Browse events, book tickets, view bookings, and manage notifications.
* **ORGANIZER:** Manage owned events and review booking and sales analytics.
* **ADMIN:** View system analytics and manage users, roles, events, and booking reports.

## Testing Checklist

* Register and log in successfully.
* Verify JWT-protected endpoints.
* Browse events and view event details.
* Book tickets and verify availability updates.
* Check tickets and booking history.
* Verify notifications.
* Test organizer event management and analytics.
* Test event status updates and cancellation behavior.
* Test admin access restrictions and dashboard statistics.
* Download and verify the booking CSV report.

## Security Notes

* Do not commit `.env`, database files containing real user data, or secrets to version control.
* Use a strong, unique JWT secret key.
* Keep passwords hashed.
* Protect role-restricted endpoints on the backend.
* Validate input and verify resource ownership.
* Configure production settings before deployment.

## Conclusion

SmartEvent combines event discovery, ticket booking, role-based access control, event management, notifications, and analytics in a React and FastAPI application.
