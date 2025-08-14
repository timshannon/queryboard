# queryboard
A dashboard for querying and manipulating table datasets

## Overview
The goal QueryBoard is to have a tool where you can quickly and easily import datasets from many different sources and
query them or manipulate them in various ways.

A new QueryBoard will create a single SQLite database. You can then import files (csv, excel, json, text, etc) or open 
a URL and QueryBoard will parse the webpage looking for structured data, and create SQLite tables from the data.

From there you can query and join the data, easily create new tables from your queries, create graphs of the data, and
export the database back out to csv, json, excel, or just download the whole SQlite database.

There are many database management front ends, and querying tools, but QueryBoard aims to be more than just a DBMS 
front end. SQL is a powerful language for exploring large datasets, and QueryBoard's primary goal is to make it easy
for you to import that data from anywhere, work with it, and export it however you want.


## Planned Features

* Extensible data imports from a wide variety of sources
* Extensible data exports included templated outputs so you can easily structure JSON or XML exports
* Job Scheduler to make sure your datasets are up to date, or to track the change in a dataset over time

