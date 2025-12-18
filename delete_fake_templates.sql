-- Run this in your Supabase SQL Editor to permanently delete the fake templates

DELETE FROM templates 
WHERE title IN (
    'Product Showcase',
    'Unboxing Experience',
    'Skincare Routine',
    'Food Commercial',
    'Fashion Reel',
    'Tech Product Demo',
    'Lifestyle Shot',
    'Makeup Tutorial',
    'Dropship Winner',
    'Street Style',
    'Before & After'
);
