export type Job = {
	title: string
	company: string
	location: string
	salary: string
	requirements: string[]
	contact_info: string
	source_url: string
	raw_text: string
	source_method?: 'manual' | 'extension' | 'whatsapp'
}
