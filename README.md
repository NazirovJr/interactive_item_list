# Interactive Item List

A full-stack application featuring a list with 1,000,000 items with the following functionality:
- Item selection (single and multiple)
- Search/filtering
- Drag and drop reordering
- Infinite scrolling (loading 20 items at a time)
- Persistence of selected and reordered items

## Tech Stack

- Backend: Express.js
- Frontend: React + TypeScript + Vite
- State Management: React Query
- Styling: Tailwind CSS
- Drag and Drop: react-beautiful-dnd

## Setup (Local Development)

1. Install dependencies:

```bash
npm run install-all
```

This will install dependencies for the root project, server, and client.

2. Start the application:

```bash
npm start
```

This will start both the server (on port 3001) and client (on port 5173) concurrently.

## Docker Deployment

You can also run the application using Docker:

```bash
# Build and start the containers
docker-compose up -d

# Stop the containers
docker-compose down
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost/api

## Features

- **Item Selection**: Each row can be selected individually or in bulk using checkboxes
- **Search**: Filter items using the search input
- **Drag & Drop**: Reorder items by dragging them
- **Infinite Scrolling**: Only 20 items are loaded at a time, more load as you scroll
- **Persistence**: Selected and sorted items are preserved after page reload

## API Endpoints

- `GET /api/items`: Get items with pagination
- `PUT /api/items/select`: Update item selection status
- `PUT /api/items/order`: Update custom item order 