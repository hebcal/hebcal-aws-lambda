create temporary table population as 
select State,CityMixedCase,SUM(Population) as population 
from ZIPCodes_Primary group by 1,2
;

.output zips.txt

select z.ZipCode,z.State,z.CityMixedCase,z.Latitude,z.Longitude,z.TimeZone,z.DayLightSaving
from ZIPCodes_Primary z, population p
where z.State = p.State AND z.CityMixedCase = p.CityMixedCase
order by p.population desc, z.ZipCode
;

-- grep -v '|0|0|0|' zips.txt | perl -pe 's/^/"/; s/$/",/;' > zips.json
