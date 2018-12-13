const request = require('../lib/request')

describe('Get matching shows', () => {
    test('Get a valid show', async () => {
        expect.assertions(1)
        return request.getMatching('steins', 3)
            .then(response => {
                expect(response.length).toBe(3)
            })
    })

    test('Get an undefined show', () => {
        expect.assertions(1)
        return request.getMatching(undefined, 3)
            .then(response => {
                expect(response.err).toBe('Non-valid show name')
            })
    })

    test('Get an emoji', () => {
        expect.assertions(1)
        return request.getMatching('📚', 3)
            .then(response => {
                expect(response.err).toBeDefined()
            })
    })
})