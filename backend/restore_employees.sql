INSERT INTO \"Employee\" (id, name, \"hiredAt\") 
SELECT '11111', 'Test Employee 1', NOW() 
WHERE NOT EXISTS (SELECT 1 FROM \"Employee\" WHERE id = '11111');
