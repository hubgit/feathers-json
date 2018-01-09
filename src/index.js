const fs = require('fs-extra')
const glob = require('glob')
const path = require('path')
const ULID = require('ulid')

module.exports = baseDir => options => {
  if (!baseDir) {
    throw new Error('baseDir must be defined')
  }

  if (!options.name) {
    throw new Error('options.name must be defined')
  }

  const serviceDir = path.join(baseDir, options.name)

  fs.ensureDirSync(serviceDir)

  const itemDir = id => {
    if (id.indexOf('/') !== -1) {
      throw new Error('No slashes in the id!')
    }

    const dir = path.join(serviceDir, id)

    fs.ensureDirSync(dir)

    return dir
  }

  const dataPath = id => {
    return path.join(itemDir(id), 'data.json')
  }

  const read = id => {
    return fs.readJson(dataPath(id))
  }

  const write = (id, data) => {
    return fs.writeJson(dataPath(id), data, { spaces: 2 }).then(() => data)
  }

  const remove = id => {
    return fs.remove(itemDir(id))
  }

  return {
    async find (params) {
      const paths = glob.sync(path.join(serviceDir, '*'))
      paths.reverse() // reverse chronological

      const total = paths.length

      const skip = Math.min(total, params.query.skip)

      const limit = params.query.limit
        ? Math.min(options.paginate.max, params.query.limit)
        : options.paginate.default

      const data = paths.slice(skip, limit).map(dir => {
        return fs.readJsonSync(path.join(dir, 'data.json'))
      })

      return {total, data}
    },

    get(id) {
      return read(id)
    },

    create(data) {
      data.id = ULID.ulid()
      data.created = new Date

      return write(data.id, data)
    },

    update(id, data) {
      data.updated = new Date

      return write(id, data)
    },

    patch(id, data) {
      data.updated = new Date

      return read(id).then(existing => {
        return write(id, { ...existing, ...data })
      })
    },

    remove(id) {
      return read(id).then(data => {
        return remove(id).then(() => data)
      })
    }
  }
}
