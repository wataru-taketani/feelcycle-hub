#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { lessonsService } from '../src/services/lessons-service';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// GET /lessons endpoint
app.get('/lessons', async (req, res) => {
  try {
    const { studioCode, date, program, instructor } = req.query;

    if (!studioCode || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: studioCode and date',
      });
    }

    const filters: any = {};
    if (program) filters.program = program;
    if (instructor) filters.instructor = instructor;

    console.log(`Searching for lessons: studio=${studioCode}, date=${date}`);
    const lessons = await lessonsService.getLessonsForStudioAndDate(
      studioCode as string,
      date as string,
      filters
    );

    console.log(`Found ${lessons.length} lessons`);

    res.json({
      success: true,
      data: {
        studio: { code: studioCode, name: studioCode === 'ksg' ? '越谷' : studioCode },
        date,
        lessons,
        total: lessons.length,
        available: lessons.filter(l => l.isAvailable === 'true').length,
      },
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search lessons',
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple API server running at http://localhost:${port}`);
  console.log(`📋 Test endpoint: http://localhost:${port}/lessons?studioCode=ksg&date=2025-07-20`);
});