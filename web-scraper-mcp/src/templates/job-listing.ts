import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/job/', '/jobs/', '/careers/', '/opening/', '/position/', '/vacancy/', '/apply/'],
  selectors: [
    '[itemtype*="JobPosting"]',
    '[itemtype*="schema.org/JobPosting"]',
    '.job-listing',
    '.job-posting',
    '.job-details',
    '.career-opportunity',
  ],
  requiredElements: [
    '.job-title',
    '[itemprop="title"]',
    '.position-title',
    '.job-location',
    '[itemprop="jobLocation"]',
    '.apply-button',
    '.apply-now',
  ],
  keywords: [
    'apply now',
    'job description',
    'requirements',
    'qualifications',
    'salary',
    'benefits',
    'full-time',
    'part-time',
    'remote',
  ],
};

export const jobListingTemplate: Template = {
  name: 'job_listing',
  description: 'Extract job posting information',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="title"]',
      '.job-title',
      'h1.position-title',
      '.job-header h1',
      '[data-job-title]',
    ],

    company: [
      '[itemprop="hiringOrganization"]',
      '.company-name',
      '.employer-name',
      '.organization',
      '[data-company]',
    ],

    location: [
      '[itemprop="jobLocation"]',
      '.job-location',
      '.location',
      '.work-location',
      '[data-location]',
    ],

    salary: {
      selectors: [
        '[itemprop="baseSalary"]',
        '.salary',
        '.salary-range',
        '.compensation',
        '[data-salary]',
      ],
      regex: /\$[\d,]+/,
    },

    employmentType: [
      '[itemprop="employmentType"]',
      '.employment-type',
      '.job-type',
      '.work-type',
      '.contract-type',
    ],

    description: [
      '[itemprop="description"]',
      '.job-description',
      '.job-details',
      '.position-description',
      '#job-description',
    ],

    requirements: {
      selectors: [
        '.requirements',
        '.qualifications',
        '.job-requirements',
        '.required-skills',
        '.requirements li',
      ],
      multiple: true,
    },

    benefits: {
      selectors: ['.benefits', '.perks', '.job-benefits', '.benefits-list li', '.perks li'],
      multiple: true,
    },

    datePosted: [
      '[itemprop="datePosted"]',
      '.posted-date',
      '.publish-date',
      '.job-posted',
      'time[datetime]',
    ],

    validThrough: ['[itemprop="validThrough"]', '.deadline', '.closing-date', '.expires'],

    experienceLevel: [
      '.experience-level',
      '.seniority-level',
      '.experience-required',
      '[data-experience]',
    ],

    education: ['.education-required', '.education-level', '.degree-required', '.qualification'],

    department: ['.department', '.team', '.division', '.job-category'],

    applicationUrl: {
      selectors: ['.apply-button', '.apply-now', '.apply-link', '[href*="apply"]'],
      attribute: 'href',
    },

    remote: {
      selectors: ['.remote-work', '.work-from-home', '.remote-position'],
      contains: ['remote', 'work from home', 'anywhere', 'distributed'],
    },

    skills: {
      selectors: ['.skills', '.required-skills', '.skill-tag', '.skills-list li'],
      multiple: true,
    },
  },
};
