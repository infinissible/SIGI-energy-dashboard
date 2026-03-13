# SIGI Energy Dashboard

SIGI Energy Dashboard is a real-time energy monitoring and analytics application developed for facility-scale solar and building energy analysis. It integrates data from building meters, solar inverters, and weather stations to provide live system visibility, historical trends, and operational insights through an interactive web dashboard.

The platform is designed to help users monitor energy generation and consumption, evaluate power demand, and analyze the impact of solar generation on facility operations and utility cost savings.

## Demo

![Dashboard Demo](./assets/sigi-demo.gif)

[Watch the full demo video on YouTube](https://youtu.be/q_jhWtNiBvg)

## Overview

The dashboard combines multiple data sources into a unified application for energy monitoring and reporting:

- **Meters and field devices**
  - 3 solar inverters
  - 3 building meters
  - 2 weather stations

- **Frontend**
  - Built with **TypeScript**
  - Retrieves and visualizes data from backend APIs

- **Backend**
  - Built with **Python**
  - Reads processed data from a MySQL database
  - Exposes APIs for the frontend
  - Includes a notification system for data disconnects or power-loss-related events

- **Database and data pipeline**
  - Meter data is collected from Shark meters and related field devices
  - Real-time power demand data is processed at short intervals
  - Energy data is processed at longer intervals for historical analysis
  - Data is stored in **MySQL** and exported to CSV for logging and recordkeeping

## Features

- Real-time monitoring of:
  - power generation
  - net load
  - energy generation
  - net energy across PV systems and facilities

- Interactive plotting of real-time and historical data for:
  - selected inverters
  - buildings
  - weather stations

- Time-series visualization for periods of up to 7 days

- Building-level analytics displayed through dashboard cards and summary views

- Energy trend graphs and reporting views for short-term analysis

- Savings analysis logic for estimating the effect of solar generation on utility bills

- Notification and alarm logic for detecting stale, disconnected, or restored data streams

## Architecture

The application is composed of three primary layers:

1. **Frontend**
   - User interface and data visualization
   - Built in TypeScript
   - Consumes backend APIs

2. **Backend**
   - Business logic, analytics, and API services
   - Built in Python
   - Handles notification logic and query processing

3. **Database / Data ingestion**
   - Stores processed telemetry and analytics data in MySQL
   - Receives data derived from meters, inverters, and weather stations
   - Supports both real-time and historical reporting

## Use Cases

This project is intended for:

- real-time solar and facility energy monitoring
- building-level energy analysis
- operational visibility for distributed energy systems
- utility savings estimation
- dashboard-driven reporting for energy infrastructure

## Tech Stack

- **Frontend:** TypeScript
- **Backend:** Python
- **Database:** MySQL
- **Data sources:** building meters, inverters, weather stations
- **Output:** interactive dashboards, analytics views, CSV logging

## Notes

This public repository is a showcase version of the project. Sensitive deployment configuration, credentials, and environment-specific infrastructure details have been omitted.
